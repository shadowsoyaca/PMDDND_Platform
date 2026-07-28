# Deployment: versioned builds and rollback

*Phase 2 Story 3.5. Lives at `docs/DEPLOY.md`.*

This describes how builds are stored on the server, why the layout is shaped
that way, and what was set up by hand to get there. The README covers the
day-to-day deploy commands; this covers the reasoning and the one-time setup
behind them.

---

## The idea in one paragraph

The service does not start a fixed filename any more. It starts a symlink called
`current.jar`, which is not a build but a note saying which build is live.
Deploying means putting the new build in a folder under its own name and
rewriting the note. Nothing is overwritten, so every recent build is still on
disk. Rolling back means rewriting the note again and restarting.

---

## Server layout

```
/opt/dndplatform/
    current.jar        -> releases/dndplatform-2.3.5-20260724-040359.jar
    releases/
        dndplatform-2.1.0-20260707-010749.jar
        dndplatform-2.3.5-20260724-034213.jar
        dndplatform-2.3.5-20260724-040359.jar     <- live

/etc/dndplatform/dndplatform.env      root-only, 600, four runtime secrets
/etc/systemd/system/dndplatform.service
/usr/local/bin/dndplatform-deploy     installed copy of deploy/deploy.sh
```

Everything in `/opt/dndplatform` is owned by `dndapp`, including the symlink.

### Why builds live in their own folder

The deploy script deletes old builds. That is a command that removes files
matching a pattern, and it should only ever be pointed at a directory containing
builds and nothing else. In the application root it would sit next to anything
the app itself might write there later.

### Why the pointer is called `current.jar` and not `dndplatform.jar`

There was a real file at `/opt/dndplatform/dndplatform.jar` when this story
started. Reusing that path would have meant replacing a real file with a symlink
during the changeover, and a half-finished changeover leaves you unsure which
one you are looking at. A new name let the new path be proven working while the
old file sat untouched as the undo. The old file and its `.bak` were deleted only
after the first real deploy succeeded.

---

## Build names

```
dndplatform-2.3.5-20260724-040359.jar
             |     |        |
             |     |        time of install (HHMMSS)
             |     date of install (YYYYMMDD)
             version, from <version> in pom.xml
```

**The version is `phase.story.child`.** `2.3.5` is Phase 2 Story 3.5. It is set
in `pom.xml` and bumped on each story branch. That is the single place it is
defined: the deploy script reads it back out of the uploaded filename rather
than being told separately, and Phase 2 Story 4.5 will read it out of the running app so
`/health` reports the real build.

**The timestamp is generated at install time, not read off the file.** This is
the part that makes the whole story work. Without the timestamp, the filename would be dndplatform-2.3.5.jar. So:
- The first deploy writes dndplatform-2.3.5.jar
- You find it broken, fix it, and deploy it again.
- Second deploy writes dndplatform-2.3.5.jar which is the same name but it replaces the first. 
 With the stamp, both builds are on disk.

---

## How many builds are kept, and why five

`KEEP_BUILDS=5` in the deploy script.

The disk is not the constraint. 

The real limit is that old builds stop being usable. Flyway migrations only run
forward. Once a deploy has changed the schema, a build from before that change is
running against a database it does not expect, with Hibernate set to `validate`.
It will most likely refuse to start.

Cleanup runs **only after a successful health check**. A failed deploy deletes
nothing, because the older builds are exactly what you are about to need. It
sorts by modification time rather than by name, and refuses to delete whatever
the pointer currently resolves to even if the count says it should go.

---

## Rolling back

One command. The deploy script prints it for you on failure, with the previous
build already filled in:

```bash
sudo ln -sfn /opt/dndplatform/releases/<build>.jar /opt/dndplatform/current.jar && \
sudo chown -h dndapp:dndapp /opt/dndplatform/current.jar && \
sudo systemctl restart dndplatform
```

To pick a build by hand, list them newest first:

```bash
ls -lt /opt/dndplatform/releases
```

### Why rollback is deliberately manual

Phase 1 Story 10 chose manual-only on the grounds that the script should not
perform surgery silently. Versioned builds make automatic rollback cheap, so the
decision was revisited in this story and deliberately kept. Three reasons:

1. **A failed health check usually is not the JAR's fault.** The app can fail to
   start because the database is down, a setting is missing, or a port is taken.
   Swapping the build back fixes none of those, and it changes the state of the
   machine right before you start reading logs.

2. **Rolling the build back does not roll the database back.** Flyway owns the
   schema. A deploy can run a migration successfully and then fail for an
   unrelated reason. Quietly reinstating the older build would leave old code
   running against a newer schema. An automatic action that can create a code and
   schema mismatch without telling you is worse than a script that stops.

3. **Someone is always watching.** Auto-rollback earns its keep on systems with
   users at three in the morning. Here, one person runs the deploy and is at the
   keyboard when it fails.

This was borne out on the first real deploy of this story: the app failed to
start because of a wrong database password. The build was fine. Automatic
rollback would have reinstated a Phase 1 build with no database wiring at all,
which would have come up healthy and reported a clean recovery — leaving a green
server and no idea what went wrong.

---

## One-time setup performed by hand

None of this needs repeating. It is recorded so the server could be rebuilt, and
so the current state is explicable.

The work was split into three steps, each introducing **one** new variable, so
that a failure would have one suspect rather than four.

### Step A — prove the layout, with the code already running

Created `releases/`, archived the running build into it under its proper name,
created the pointer, and switched the unit to follow it. The application did not
change at all, so a healthy restart proved the symlink layout worked and nothing
else.

```bash
sudo mkdir -p /opt/dndplatform/releases
date -r /opt/dndplatform/dndplatform.jar +%Y%m%d-%H%M%S      # -> the stamp
sudo cp -p /opt/dndplatform/dndplatform.jar \
           /opt/dndplatform/releases/dndplatform-2.1.0-<STAMP>.jar
sudo chown -R dndapp:dndapp /opt/dndplatform/releases
sudo ln -sfn /opt/dndplatform/releases/dndplatform-2.1.0-<STAMP>.jar \
             /opt/dndplatform/current.jar
sudo chown -h dndapp:dndapp /opt/dndplatform/current.jar
```

Then `ExecStart` in the unit was changed from `dndplatform.jar` to `current.jar`,
followed by `daemon-reload` and a restart. The old `dndplatform.jar` and its
`.bak` were left in place as the undo, and deleted only after Step C passed.

### Step B — prove the environment file, still with the old code

The server had never had the four runtime secrets, which is why Story 2 and
Story 3 code had never been able to run there.

```bash
sudo mkdir -p /etc/dndplatform
sudo nano /etc/dndplatform/dndplatform.env
sudo chown root:root /etc/dndplatform/dndplatform.env
sudo chmod 600 /etc/dndplatform/dndplatform.env
```

Contents: four lines, **no quotes on any value**, including the person name
despite its space. This is not a shell script; everything after the `=` to the
end of the line is the value. systemd does not expand variables here, so the
dollar signs in a BCrypt hash are safe.

```
DB_PASSWORD=...
APP_OWNER_USERNAME=...
APP_OWNER_PASSWORD_HASH=...
APP_OWNER_PERSON_NAME=...
```

`DB_URL` and `DB_USERNAME` are not in the file — their defaults in
`application.yaml` already match the server.

Then `EnvironmentFile=/etc/dndplatform/dndplatform.env` was added to the unit,
followed by `daemon-reload` and a restart.

**The file is root-only and the app runs as `dndapp`, which cannot read it.**
That is correct. systemd reads the file while still root and hands the values to
the process as it starts. The service account gets the values without ever
getting access to the file, so a compromise of the app cannot read the secrets
off disk.

To verify what actually reached the running process:

```bash
pid=$(systemctl show dndplatform -p MainPID --value)
sudo cat /proc/$pid/environ | tr '\0' '\n' | grep -E 'DB_PASSWORD|APP_OWNER'
```

This prints the secrets to the terminal. Fine on your own server shell; clear the
scrollback afterwards if that matters.

**What Step B could not prove.** The build running at the time did not read any
of those values, so the step proved only that the file parses and systemd accepts
it. A wrong value would not surface until Step C — and one did.

### Step C — deploy the real code

Upload, install the script, sync the unit file, deploy. This was the first run of
Flyway against the server database: it created `flyway_schema_history`, applied
V1, and `OwnerBootstrap` seeded the owner row.

The first attempt failed with `password authentication failed for user
"pmd_app"`. That password had been set once in Phase 1 Story 6 and never used,
because nothing had ever connected to that database before. It was reset from the
`postgres` superuser account:

```sql
ALTER USER pmd_app WITH PASSWORD '...';
```

and proven independently of the app before going into the environment file:

```bash
psql -h localhost -U pmd_app -d pmd_dnd
```

`-h localhost` forces a network connection rather than a local socket, which is
how the app connects.

---

## Which terminal, which machine

The build and the upload run on different shells, and this is not cosmetic.

- **Build:** Windows PowerShell, `.\mvnw.cmd clean package`
- **Upload:** **WSL Ubuntu**, `scp ...`

The SSH key was generated in WSL during Phase 1 Story 2. WSL and Windows keep
separate `.ssh` folders, so Windows OpenSSH has no key to offer and `scp` from
PowerShell fails. From WSL, the repository is reached under `/mnt/c/...`.

---

## Keeping the repo and the server in sync

Three copies of the deploy script exist, and they are updated at different times:

| Copy | Updated by |
|---|---|
| `deploy/deploy.sh` in the repo | editing and committing |
| `~/deploy.sh` on the server | `scp` |
| `/usr/local/bin/dndplatform-deploy` | `sudo install -m 0755 ~/deploy.sh /usr/local/bin/dndplatform-deploy` |

The installed copy is a **copy**, not a link. Editing the repository does nothing
to the running script until it is reinstalled. This is the easiest thing in the
whole setup to forget.

`deploy/dndplatform.service` and `deploy/Caddyfile` are reference copies kept
byte-for-byte identical to the live files. To check:

```bash
ssh matthew@<server-ip> "cat /etc/systemd/system/dndplatform.service" | diff - deploy/dndplatform.service
```

No output means identical. 

---

## Known gap

`/health` returns a hand-typed version string, so it reports the same text
whichever build is running and cannot be used to confirm a rollback took effect.
Use the pointer and the startup log line instead:

```bash
readlink -f /opt/dndplatform/current.jar
sudo journalctl -u dndplatform --since "-10m" --no-pager | grep -i "Starting DndplatformApplication"
```

The log line reports the version the running app was built as. Phase 2 Story 4.5
puts the real build onto `/health` and closes this gap.