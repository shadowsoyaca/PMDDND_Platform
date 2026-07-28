#!/usr/bin/env bash
#
# deploy.sh — PMD D&D Platform server-side deploy  [Phase 2, Story 3.5]
#
# Run this ON THE SERVER, as root (via sudo), AFTER you have built the JAR on
# your dev machine and uploaded it to your home directory with scp.
#
#   Dev machine (Windows PowerShell, from the repo root):
#     .\mvnw.cmd clean package
#     scp target\dndplatform-2.3.5.jar matthew@<server-ip>:~/
#   
#   Server:
#     sudo dndplatform-deploy
#
# One-time install, and again whenever this file changes:
#     sudo install -m 0755 ~/deploy.sh /usr/local/bin/dndplatform-deploy
#
# NOTE: the whole deploy model changed in this story. It used to overwrite a
# single file called dndplatform.jar and keep one backup called
# dndplatform.jar.bak. Now every build is kept under its own name inside
# /opt/dndplatform/releases, and a symlink at /opt/dndplatform/current.jar says
# which one is live. The systemd unit starts current.jar and never changes.
#
# Deploying = put the new build in releases, move the pointer, restart.
# Rolling back = move the pointer back, restart. That is all it is.
#
# NOTE: this script still does NOT roll back on its own. That is deliberate and
# was re-confirmed in this story. A failed health check usually means something
# other than the JAR, such as a missing setting or a database problem, and
# swapping the build back would change the state of the machine right before you
# start reading logs. More importantly, Flyway migrations only run forward. A
# deploy can change the database and then fail, and putting the older build back
# does NOT put the older database back. On failure this script stops and prints
# the exact one-line rollback command with the previous build named in full.
#
set -euo pipefail

# ---- Settings ---------------------------------------------------------------
APP_DIR="/opt/dndplatform"
# NOTE: new. Every deployed build lives here, and nothing else does. The cleanup
# step at the bottom deletes files from this folder, so it must contain builds
# and only builds.
RELEASES_DIR="${APP_DIR}/releases"
# NOTE: new. The pointer. Not a JAR, just a note saying which JAR is live.
POINTER="${APP_DIR}/current.jar"
SERVICE="dndplatform"
SERVICE_USER="dndapp"
HEALTH_URL="http://localhost:8080/health"

# NOTE: new. How many builds to keep. Five is not about disk space, a build is
# only about 56 MB. It is about how far back is actually useful: once a deploy
# has run a database migration, builds from before that migration will not start
# against the changed database. Keeping fifty would look like fifty steps of
# safety while only the builds since the last migration can really be used.
KEEP_BUILDS=5

HEALTH_RETRIES=15      # how many times to poll /health
HEALTH_DELAY=2         # seconds between polls

# ---- Find the uploaded JAR --------------------------------------------------
# NOTE: this changed. The old script defaulted to a hardcoded filename with the
# version baked into it. The version now changes every story, so a hardcoded
# name would need editing constantly. Instead we look for any dndplatform-*.jar
# in the uploading user's home directory, and refuse to guess if there is more
# than one.
UPLOAD_USER="${SUDO_USER:-$USER}"
UPLOAD_DIR="/home/${UPLOAD_USER}"

if [[ $# -ge 1 ]]; then
  # An explicit path was given as the first argument. Use it as-is.
  SRC_JAR="$1"
else
  # No argument. Look in the home directory for exactly one candidate.
  mapfile -t candidates < <(find "${UPLOAD_DIR}" -maxdepth 1 -type f -name 'dndplatform-*.jar' | sort)

  if [[ "${#candidates[@]}" -eq 0 ]]; then
    echo "ERROR: no dndplatform-*.jar found in ${UPLOAD_DIR}" >&2
    echo "       Build it on the dev machine and scp it to your home dir first," >&2
    echo "       or pass the path as the first argument." >&2
    exit 1
  fi

  if [[ "${#candidates[@]}" -gt 1 ]]; then
    echo "ERROR: more than one dndplatform-*.jar found in ${UPLOAD_DIR}:" >&2
    printf '         %s\n' "${candidates[@]}" >&2
    echo "       Delete the ones you do not want, or pass the right path as the" >&2
    echo "       first argument. Refusing to guess which build you meant." >&2
    exit 1
  fi

  SRC_JAR="${candidates[0]}"
fi

# ---- Guards -----------------------------------------------------------------
if [[ "${EUID}" -ne 0 ]]; then
  echo "ERROR: run with sudo (need root to write ${APP_DIR} and restart the service)." >&2
  exit 1
fi

if [[ ! -f "${SRC_JAR}" ]]; then
  echo "ERROR: uploaded JAR not found at: ${SRC_JAR}" >&2
  exit 1
fi

# NOTE: new. Make sure the releases folder exists before we try to put anything
# in it. Harmless if it is already there.
mkdir -p "${RELEASES_DIR}"

# ---- Work out the name this build will be stored under ----------------------
# NOTE: all new. The stored name is the version from the uploaded file, plus the
# date and time of THIS install.
#
# The version comes out of the filename, which Maven produced from the <version>
# in pom.xml. That means the pom is the single place the version is set, and the
# script never has to be told separately.
#
# The timestamp is generated right now rather than read off the file, so that
# uploading and deploying the same build twice produces two different names
# instead of one silently replacing the other. That was the whole point of the
# story: two deploys in one evening used to leave you with only one step back.
SRC_NAME="$(basename "${SRC_JAR}")"

if [[ ! "${SRC_NAME}" =~ ^dndplatform-(.+)\.jar$ ]]; then
  echo "ERROR: cannot read a version out of the filename: ${SRC_NAME}" >&2
  echo "       Expected something like dndplatform-2.3.5.jar" >&2
  exit 1
fi
VERSION="${BASH_REMATCH[1]}"

STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET_JAR="${RELEASES_DIR}/dndplatform-${VERSION}-${STAMP}.jar"

# ---- Remember what is live right now, for the rollback message --------------
# NOTE: new. Captured BEFORE the pointer moves, because once it moves this
# information is gone. If the deploy fails, this is the build the failure
# message tells you how to go back to.
PREVIOUS_JAR=""
if [[ -L "${POINTER}" ]]; then
  PREVIOUS_JAR="$(readlink -f "${POINTER}")"
fi

echo "==> Deploying ${SRC_NAME}  (version ${VERSION})"
if [[ -n "${PREVIOUS_JAR}" ]]; then
  echo "==> Currently live: $(basename "${PREVIOUS_JAR}")"
fi

# ---- Store the new build ----------------------------------------------------
# NOTE: changed. Moves into releases under its own name. Nothing is overwritten,
# so there is no backup copy to make any more.
mv "${SRC_JAR}" "${TARGET_JAR}"
chown "${SERVICE_USER}:${SERVICE_USER}" "${TARGET_JAR}"
echo "==> Stored build as $(basename "${TARGET_JAR}")"

# ---- Move the pointer -------------------------------------------------------
# NOTE: new. This is the actual deploy. -s makes a symlink, -f replaces the
# existing one, -n stops it doing something surprising if the target is a
# directory. The -h on chown sets ownership of the link itself rather than of
# the file it points at.
ln -sfn "${TARGET_JAR}" "${POINTER}"
chown -h "${SERVICE_USER}:${SERVICE_USER}" "${POINTER}"
echo "==> Pointer ${POINTER} now points at $(basename "${TARGET_JAR}")"

# ---- Restart the service ----------------------------------------------------
echo "==> Restarting ${SERVICE} ..."
systemctl restart "${SERVICE}"

# ---- Wait for health --------------------------------------------------------
echo "==> Waiting for ${HEALTH_URL} ..."
healthy=0
body=""
for ((i=1; i<=HEALTH_RETRIES; i++)); do
  if body="$(curl -fsS "${HEALTH_URL}" 2>/dev/null)"; then
    healthy=1
    break
  fi
  sleep "${HEALTH_DELAY}"
done

# ---- Failure ----------------------------------------------------------------
# NOTE: changed. The failure message now names the exact build to go back to,
# instead of a generic restore line you had to assemble yourself.
if [[ "${healthy}" -ne 1 ]] || ! systemctl is-active --quiet "${SERVICE}"; then
  echo "ERROR: deploy failed — ${SERVICE} did not become healthy within $((HEALTH_RETRIES * HEALTH_DELAY))s." >&2
  echo "       Inspect:  sudo systemctl status ${SERVICE}  ;  journalctl -u ${SERVICE} -n 50" >&2
  echo >&2
  if [[ -n "${PREVIOUS_JAR}" && -f "${PREVIOUS_JAR}" ]]; then
    echo "       To roll back to $(basename "${PREVIOUS_JAR}"), run:" >&2
    echo >&2
    echo "         sudo ln -sfn ${PREVIOUS_JAR} ${POINTER} && sudo chown -h ${SERVICE_USER}:${SERVICE_USER} ${POINTER} && sudo systemctl restart ${SERVICE}" >&2
    echo >&2
    echo "       WARNING: if this deploy ran a database migration, rolling the" >&2
    echo "       build back does NOT roll the database back. Read the logs before" >&2
    echo "       you decide." >&2
  else
    echo "       No previous build recorded. Look in ${RELEASES_DIR} and point" >&2
    echo "       ${POINTER} at the one you want." >&2
  fi
  # NOTE: nothing is deleted on a failed deploy. The old builds are exactly what
  # you are about to need.
  exit 1
fi

# ---- Success ----------------------------------------------------------------
echo "==> SUCCESS: ${SERVICE} is active and /health responded:"
echo "    ${body}"

# ---- Clean up old builds ----------------------------------------------------
# NOTE: all new, and it only runs after a successful health check.
#
# Sorted by modification time, newest first, keeping KEEP_BUILDS and deleting
# the rest. Sorted by time rather than by name on purpose: version numbers do
# not sort correctly as text once a phase reaches double digits, and time is
# what "recent" actually means here.
#
# The guard below refuses to delete whatever the pointer currently resolves to,
# even if the count says it should go. Deleting the running build is the one
# genuinely bad outcome this step could produce, so it is made impossible rather
# than merely unlikely.
echo "==> Cleaning up old builds, keeping the newest ${KEEP_BUILDS} ..."
LIVE_JAR="$(readlink -f "${POINTER}")"

mapfile -t builds < <(
  find "${RELEASES_DIR}" -maxdepth 1 -type f -name 'dndplatform-*.jar' -printf '%T@ %p\n' \
    | sort -rn \
    | cut -d' ' -f2-
)

index=0
for build in "${builds[@]}"; do
  index=$((index + 1))
  if (( index <= KEEP_BUILDS )); then
    continue
  fi
  if [[ "${build}" == "${LIVE_JAR}" ]]; then
    echo "    keeping $(basename "${build}") — it is the live build"
    continue
  fi
  rm -f "${build}"
  echo "    deleted $(basename "${build}")"
done

echo "==> Done."
exit 0