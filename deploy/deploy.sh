#!/usr/bin/env bash
#
# deploy.sh — PMD D&D Platform server-side deploy  (Phase 1, Story 10)
#
# Run this ON THE SERVER, as root (via sudo), AFTER you have built the JAR on
# your dev machine and uploaded it to your home directory with scp.
#
#   Dev machine (Windows PowerShell, from the repo root):
#     .\mvnw.cmd clean package
#     scp target\dndplatform-0.0.1-SNAPSHOT.jar matthew@<server-ip>:~/
#
#   Server (after a one-time install — see deploy/README notes):
#     sudo dndplatform-deploy
#
# What it does: drops the freshly-uploaded JAR into place, hands it to the
# dndapp service account, restarts the systemd service, and confirms the app
# came back healthy before declaring success. Before replacing the JAR it saves
# the current one as a .bak safety copy; on failure it prints the one-line
# manual restore command (it does NOT auto-roll-back — full versioned rollback
# is a deferred Story 10 refinement).
#
set -euo pipefail

# ---- Settings ---------------------------------------------------------------
APP_DIR="/opt/dndplatform"
LIVE_JAR="${APP_DIR}/dndplatform.jar"          # stable name the systemd unit points at
BACKUP_JAR="${APP_DIR}/dndplatform.jar.bak"    # minimal one-step safety copy (NOT the deferred rollback system)
SERVICE="dndplatform"
SERVICE_USER="dndapp"
HEALTH_URL="http://localhost:8080/health"

# Where the uploaded JAR lands. Defaults to the home of the user who invoked
# sudo, so the build/upload step can simply scp into ~/. Override by passing a
# path as the first argument: sudo dndplatform-deploy /path/to/app.jar
UPLOAD_USER="${SUDO_USER:-$USER}"
SRC_JAR="${1:-/home/${UPLOAD_USER}/dndplatform-0.0.1-SNAPSHOT.jar}"

HEALTH_RETRIES=15      # how many times to poll /health
HEALTH_DELAY=2         # seconds between polls

# ---- Guards -----------------------------------------------------------------
if [[ "${EUID}" -ne 0 ]]; then
  echo "ERROR: run with sudo (need root to write ${APP_DIR} and restart the service)." >&2
  exit 1
fi

if [[ ! -f "${SRC_JAR}" ]]; then
  echo "ERROR: uploaded JAR not found at: ${SRC_JAR}" >&2
  echo "       Build it and scp it to your home dir first, or pass its path as the first argument." >&2
  exit 1
fi

echo "==> Deploying ${SRC_JAR}"

# ---- Back up the current JAR (minimal safety net) ---------------------------
if [[ -f "${LIVE_JAR}" ]]; then
  cp -p "${LIVE_JAR}" "${BACKUP_JAR}"
  echo "==> Saved current JAR -> ${BACKUP_JAR}"
fi

# ---- Put the new JAR in place ----------------------------------------------
mv "${SRC_JAR}" "${LIVE_JAR}"
chown "${SERVICE_USER}:${SERVICE_USER}" "${LIVE_JAR}"
echo "==> Installed new JAR as ${LIVE_JAR} (owner ${SERVICE_USER})"

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

# ---- Report -----------------------------------------------------------------
if [[ "${healthy}" -eq 1 ]] && systemctl is-active --quiet "${SERVICE}"; then
  echo "==> SUCCESS: ${SERVICE} is active and /health responded:"
  echo "    ${body}"
  exit 0
fi

echo "ERROR: deploy failed — ${SERVICE} did not become healthy within $((HEALTH_RETRIES * HEALTH_DELAY))s." >&2
echo "       Inspect:  sudo systemctl status ${SERVICE}  ;  journalctl -u ${SERVICE} -n 50" >&2
if [[ -f "${BACKUP_JAR}" ]]; then
  echo "       The previous JAR was saved. To restore it manually:" >&2
  echo "         sudo mv ${BACKUP_JAR} ${LIVE_JAR} && sudo chown ${SERVICE_USER}:${SERVICE_USER} ${LIVE_JAR} && sudo systemctl restart ${SERVICE}" >&2
fi
exit 1