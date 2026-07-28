# PMD D&D Platform

> [ "A private web application blending Pokémon Mystery Dungeon mechanics with D&D tabletop play."]

<!--
HOW TO USE THIS TEMPLATE
- Sections marked [FILL IN] are for you to complete.
- Delete these comment blocks once you've filled the section in.
-->


---

## Overview

[FILL IN: a short paragraph on what the platform is and who it's for.
Cover the core idea — a private, session-based game tool for you and your
players — and what makes it different. Keep it to 3–5 sentences.]

---

## Tech Stack

The stack below comes from the project's planning documents. Items are marked
**In use** (exists in the build today) or **Planned** (arrives in a later phase),
so the README reflects reality as the project grows.

| Area | Choice | Status |
|------|--------|--------|
| Backend language / framework | Java + Spring Boot | In use (Java **17**) |
| Build tool | Maven | In use |
| Security / auth | Spring Security | In use (Phase 2 Story 2) |
| Database | PostgreSQL | In use (Phase 1 Story 6), wired to the app (Phase 2 Story 3) |
| Schema migrations | Flyway | In use (Phase 2 Story 3) |
| ORM / data access | Spring Data JPA (Hibernate) | In use (Phase 2 Story 3) |
| Frontend | React + TypeScript | Planned (Phase 2 Story 4) |
| UI styling / components | Tailwind CSS / MUI / shadcn/ui | Planned — not chosen yet |
| Hover tooltips | Radix UI / Tippy.js | Planned (Phase 4) — not chosen yet |
| Animations | Motion (Framer Motion) | Planned (Phase 9) |
| Audio | Web Audio API | Planned (Phase 9) |
| Real-time | Spring WebSocket + browser WebSocket | Planned (Phase 6) |
| DB management (dev) | DBeaver | Dev tool |
| Version control | Git + GitHub | In use |
| IDE | VS Code | In use |
| Local Linux environment | WSL (Ubuntu) | In use |
| Reverse proxy / TLS | Caddy | In use (Phase 2 Story 1) |

---

## Prerequisites

What must be installed before the project will build and run:

- **JDK 17** — the project is locked to Java 17 (Phase 1 Story 4 / Phase 1 Story 5). Not a newer JDK.
  - Local (dev machine): Eclipse Temurin 17.0.19.
  - Server: Ubuntu OpenJDK 17.0.19 (headless). Both are OpenJDK 17 builds; the JAR is portable between them.
- **Git** + **GitHub Desktop** — version control and pushing to the repo.
- **VS Code** with the Java extensions (Extension Pack for Java; Spring Boot Extension Pack).
- **WSL (Ubuntu)** — local Linux environment mirroring the server.
- **PostgreSQL 16** — runs on the server (installed in Phase 1 Story 6) AND on the dev machine (added in Phase 2 Story 3, so the app can be built and tested locally). On the dev machine, create two databases owned by the `pmd_app` role: `pmd_dnd` (real) and `pmd_dnd_test` (used by the test suite, which wipes it constantly). To browse or manage the server database from the dev machine, use **DBeaver** over an SSH tunnel (the database port is not exposed to the public internet).

---

## Getting Started / Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/shadowsoyaca/PMDDND_Platform.git
   ```
2. **Open the project** in VS Code and confirm the JDK is set to **17**.
3. **Build the project** — Windows PowerShell, from the repo root:
   ```
   .\mvnw.cmd clean install
   ```
4. **Database** — the app is connected to PostgreSQL 16 (Phase 2 Story 3).
   - On the dev machine, install PostgreSQL 16 locally and create the `pmd_app` role plus two databases: `pmd_dnd` and `pmd_dnd_test`.
   - Flyway creates the tables on first startup; you never run the table SQL by hand.
   - The DB password is supplied at runtime through the `DB_PASSWORD` environment variable (see Configuration) and is never committed.

---

## Configuration

- **Secrets are kept out of version control.** No file in this repository ever
  holds a password, a hash, or a token. Every secret reaches the app through an
  environment variable. Config files that would hold local secrets
  (`application-local.*`, `application-secret.*`, `.env`) are git-ignored.
- **Database password (Phase 2 Story 3):** supplied at runtime through the
  `DB_PASSWORD` environment variable. Locally it is a Windows user environment
  variable; on the server it comes from a root-only env file read by systemd
  (see Deployment). Never committed.
- **Owner account (Phase 2 Story 3):** the owner is a real row in the
  database, not an in-memory account. On first startup, if no user has the
  owner's username, one is created (seeded) from three environment variables.
  If the row already exists, the variables are ignored — changing them does
  **not** change your stored password. To reset yourself, delete your row and
  restart.
  - `APP_OWNER_USERNAME` = the owner's login name.
  - `APP_OWNER_PASSWORD_HASH` = the BCrypt hash of the password. Generate it by
    running `com.pmd.dndplatform.tools.PasswordHashGenerator` on your own
    machine, which prints a hash you paste in. The plain password never leaves
    your machine and is never committed.
  - `APP_OWNER_PERSON_NAME` = the real person behind the account. Required,
    because every row in the users table must have one.
  - Locally, set all four (these three plus `DB_PASSWORD`) in your run config
    (VS Code `.vscode/launch.json`, which is git-ignored), or as Windows user
    environment variables. The app will not start if any are missing, which is
    on purpose.
- **Session cookie (Phase 2 Story 2):** the login cookie is set to `http-only`
  and `same-site: lax`. The `Secure` flag is added automatically when traffic is
  https (it is in production, via the reverse proxy), and skipped on local http
  so testing still works.
- **Server port:** 8080. On the server the app binds to `127.0.0.1` only
  (Phase 2 Story 1), so nothing reaches it except through the Caddy reverse
  proxy on 443.
- **Database connection (server-side):** PostgreSQL 16, database `pmd_dnd`, app role
  `pmd_app`, listening on `localhost:5432`. Reached from the dev machine through an SSH
  tunnel; port 5432 is **not** open to the internet. Credentials live in the password
  manager, not in any file here.

---

## Running the Application

1. Set the environment variables first (see Configuration): `DB_PASSWORD`,
   `APP_OWNER_USERNAME`, `APP_OWNER_PASSWORD_HASH`, and `APP_OWNER_PERSON_NAME`.
   The app will not start without them.
2. Start the app — Windows PowerShell, from the repo root:
   ```
   .\mvnw.cmd spring-boot:run
   ```
   (In VS Code, press F5 with the app's launch config selected, so all four
   variables are picked up. Pick the app config in the Run and Debug dropdown,
   not the hash generator.)
3. Verify it's up by opening the health-check endpoint in a browser:
   ```
   http://localhost:8080/health
   ```
   A successful response looks like: `PMD D&D Platform is up and running! Version: v2`
   This works locally because `/health` is allowed for requests from the machine
   itself. From Phase 2 Story 2 on, every other route sends a logged-out visitor
   to the login page, and outside requests to `/health` are blocked.

---

## Project Structure

```
src/main/java/com/pmd/dndplatform/

    DndplatformApplication.java   - application entry point

    HealthController.java         - serves the /health endpoint

    config/
        SecurityConfig.java       - Spring Security setup: BCrypt, database-backed
                                    login, default-deny on every route,
                                    localhost-only /health, OWNER-only /api/admin,
                                    form login

    user/
        Role.java                       - the account roles (OWNER, PLAYER)
        User.java                       - one row of the users table
        UserRepository.java             - database access for users
        DatabaseUserDetailsService.java - looks up logins in the database
        OwnerBootstrap.java             - seeds the owner row on first startup
        UserAdminService.java           - the account rules (create, list, update,
                                          delete, plus the guards)
        UserAdminController.java        - the /api/admin/users endpoints

        dto/
            CreateUserRequest.java  - incoming: new account fields
            UpdateUserRequest.java  - incoming: person-name change
            UserSummary.java        - outgoing: safe account fields (never the hash)

    tools/
        PasswordHashGenerator.java - dev helper, not part of the running app.
                                     Turns a password into a BCrypt hash you
                                     paste into APP_OWNER_PASSWORD_HASH

src/main/resources/

    application.yaml    - real config: forwarded headers, loopback bind, session
                          cookie hardening, datasource, Flyway, and the owner
                          credential env-var references

    db/migration/
        V1__create_users_table.sql - Flyway migration that creates the users table

src/test/java/com/pmd/dndplatform/

    DndplatformApplicationTests.java - basic context-loads check
    SecurityConfigTest.java          - proves the Phase 2 Story 2 security rules
                                       (now via database login)
    UserAdminTest.java               - proves the Phase 2 Story 3 account rules:
                                       create, list, update, delete, role
                                       enforcement, hash-not-password storage,
                                       and the delete guards

src/test/resources/
    application-test.yaml - points tests at the pmd_dnd_test database

pom.xml               - Maven build and dependencies
mvnw, mvnw.cmd, .mvn/ - Maven wrapper

deploy/
    deploy.sh           - server-side deploy script (Phase 2 Story 3.5: versioned builds + symlink)
    dndplatform.service - reference copy of the systemd unit
    Caddyfile           - reference copy of the reverse proxy config

docs/
    DEPLOY.md
```

---

## Roadmap & Status

**Complete:** Phase 1 — Stand Up the Server & Prove Deployment (core)

Story 1 (Provision the Server) ✅

Story 2 (Secure the Server) ✅

Story 3 (Code Repository) ✅

Story 4 (Minimal Spring Boot app) ✅

Story 5 (Install Java on the server) ✅

Story 6 (Install the database on the server) ✅

Story 7 (Deploy & run the app on the server) ✅

Story 8 (Make the app reachable from the internet) ✅

Story 9 (Run the app as a managed service) ✅

Story 10 (Establish a repeatable deployment process) ✅

Story 11 (Point a domain at the server) ⏸ deferred — see the deferral note below

Story 12 (Enable HTTPS) ⏸ deferred — the early half shipped as Phase 2 Story 1; see the deferral note below

*Note: Story 9 was done before Story 8 on purpose — stand up the durable
background service first, then expose it, so the public port is never backed
by a fragile foreground process.*

---

**In Progress:** Phase 2 — Lock the Door (First Vertical Slice)

Story 1 (Reverse proxy, self-signed TLS) ✅

Story 2 (Secure every route with Spring Security) ✅

Story 3 (Owner-created user accounts, database-backed) ✅

Story 3.5 (Fast rollback with versioned JARs) ✅

Story 4 (Login screen as the only public surface) ⬜ next

Story 4.5 (Health endpoint reports the real build) ⬜

Story 5 (Full vertical slice, browser to API to database) ⬜

Stories 6a–6d (Device-bound passkey cluster) ⏸ deferred — needs the domain, see below


---

### Deferral note: domain, HTTPS, and passkeys

Phase 1 Stories 11 and 12 and the Phase 2 Story 6 passkey cluster are deferred
together, because all three need the same thing: a registered domain name.

- **Why deferred.** To avoid paying a yearly domain cost while the project is
  far from done. Until then the app runs on its raw DigitalOcean IP, which stays
  available indefinitely.
- **Story 12 is split.** The early half — a Caddy reverse proxy with a
  self-signed certificate, establishing the real production topology — already
  shipped as Phase 2 Story 1. The late half is swapping that certificate for a
  trusted Let's Encrypt one against the real domain. A self-signed proxy with no
  domain is the deliberate setup, not an abandoned story.
- **Why passkeys are stuck behind it.** A passkey binds to a relying party ID,
  which must be a domain name. A raw IP address is not one. The cluster can be
  built and tested on `localhost`, which browsers treat as a secure context, but
  it cannot run on the server without a domain.
- **When the domain gets bought.** Whichever comes first: Story 6a going live
  for real players, or the group's first real session on the platform. Not
  "project end" — the thing that forces the purchase is people using the
  platform, not the project being finished.
- **Everything else is unaffected.** Only the public, over-the-internet
  acceptance tests are gated by HTTPS. Phases 3 through 9 have no HTTPS gate at
  all, including the Phase 6 WebSocket work.

---

**Full phase plan:**

- **Phase 0 — Finish the Blueprint:** Complete the design and a single source-of-truth architecture document.
- **Phase 1 — Stand Up the Server & Prove Deployment:** Rent the VPS, install Java and the database, deploy an empty Spring Boot app reachable at the server. *(core complete — Stories 11 and 12 deferred)*
- **Phase 2 — Lock the Door (First Vertical Slice):** Spring Security on every route, hashed passwords, no public signup, login screen, React frontend skeleton, full browser → API → database loop.
- **Phase 3 — Build the Data Backbone:** Definition/instance schema and the DM CSV-import GUI for bulk data.
- **Phase 4 — Character Data & Display (No Combat):** The read-only character sheet, hover tooltips, drop-downs.
- **Phase 5 — The Calculation Engine:** Damage math, modifier-stacking/tracking, standardized-Pokémon generator — pure backend logic.
- **Phase 6 — The Real-Time Spine:** WebSockets; the DM changes a value and everyone's screen updates instantly.
- **Phase 7 — Battle:** On-turn/off-turn battle screens, dice rolling, turn flow, knockback.
- **Phase 8 — The World & Rules-Heavy Systems:** Town navigation, shops, base-building, crafting, class gimmicks, resting, inventory mechanics.
- **Phase 9 — Make It Lively:** Full audio system and animations — deliberately last.

---

## Deployment

**Server runtime (Phase 1 Story 5):** the production droplet runs Ubuntu OpenJDK **17.0.19** (`openjdk-17-jdk-headless`), so it can execute the Spring Boot JAR. Confirmed via `java -version` / `javac -version`.

**Database (Phase 1 Story 6):** PostgreSQL **16** runs on the server as a systemd service, with the `pmd_dnd` database owned by the dedicated non-root role `pmd_app`.

**Runtime secrets on the server (Phase 2 Story 3):** the app reads `DB_PASSWORD`,
`APP_OWNER_USERNAME`, `APP_OWNER_PASSWORD_HASH`, and `APP_OWNER_PERSON_NAME` from a
root-only environment file at `/etc/dndplatform/dndplatform.env` (permissions `600`,
owned by root). The systemd unit loads it with an `EnvironmentFile=` line. systemd
reads the file as root before handing control to the app, so the values never appear
in the repo, in the service file, or in a process listing. On first startup Flyway
creates the users table and the owner account is seeded; no manual SQL is needed.

### Network shape (Phase 2 Story 1)

- **Caddy** terminates HTTPS on `443` and reverse-proxies to `localhost:8080`.
  The certificate is self-signed, so a browser shows a warning. That is expected
  and correct until domain cutover.
- **Tomcat binds to `127.0.0.1` only.** The app is physically unreachable from
  outside even if the firewall were wrong. This is defence in depth alongside
  UFW, not instead of it.
- **UFW** is active with default deny incoming, allowing `22/tcp` (SSH) and
  `443/tcp` (HTTPS) only. Port `8080` was closed when the proxy went in. Port
  `80` stays closed until domain cutover, when it is needed for the ACME
  challenge and the http-to-https redirect. Port `5432` is closed.
- **No DigitalOcean Cloud Firewall** is attached. UFW plus the loopback bind is
  the whole story, on purpose — one well-understood layer beats two
  half-remembered ones.
- **`/health` is not publicly reachable.** Since Phase 2 Story 2 it answers only
  requests from the machine itself (`127.0.0.1` and `::1`), which is what lets
  the deploy script's local poll keep working. An outside request is sent to the
  login page.

**Run as a managed service (Phase 1 Story 9):**
The app runs under systemd as `dndplatform.service`, executing as the dedicated,
no-login system account `dndapp`. The unit starts `/opt/dndplatform/current.jar`, a symlink pointing at the live build in `/opt/dndplatform/releases/` (Phase 2 Story 3.5).
The unit is enabled (starts on boot), auto-restarts on failure, and is hardened
(`NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`).

- Status:  `sudo systemctl status dndplatform`
- Logs:    `journalctl -u dndplatform -f`
- Restart: `sudo systemctl restart dndplatform`
- Health:  `curl http://localhost:8080/health` — run this **on the server**

**Build & transfer (Phase 1 Story 7):**
1. Build the executable JAR on the dev machine on the Windows PowerShell, from the repo root:
   `.\mvnw.cmd clean package` → produces `target\dndplatform-2.3.5.jar'
   (a single runnable "fat" JAR). The version comes from '<version>' in 'pom.xml' and is bumped on each story branch: phase.story.child, so '2.3.5' is Phase 2 Story 3.5.
2. Copy it to the server with `scp` and deploy it with the script. The manual
   `mv` into `/opt/dndplatform` that this step used to describe is gone — the
   deploy script now places the build. See **Repeatable deploy process** below

**Repeatable deploy process (Phase 1 Story 10):** the build → transfer → restart
sequence is a documented routine backed by a server-side script in `deploy/`.

One-time install of the script on the server (re-run whenever `deploy.sh` changes):
```
sudo install -m 0755 ~/deploy.sh /usr/local/bin/dndplatform-deploy
```

Each deploy:

1. Dev machine (Windows PowerShell, from the repo root):
   `.\mvnw.cmd clean package` → `target\dndplatform-2.3.5.jar`
2. Upload it (WSL Ubuntu, from the repo root under `/mnt/c/...`):
   `scp target/dndplatform-2.3.5.jar matthew@<server-ip>:~/`
3. Server (over SSH):
   `sudo dndplatform-deploy`
   The script moves the uploaded JAR into `/opt/dndplatform/releases/` under a
   name carrying its version and the time of install (for example
   `dndplatform-2.3.5-20260724-034213.jar`), repoints the `current.jar` symlink
   at it, restarts `dndplatform.service`, polls `http://localhost:8080/health`,
   and reports PASS or FAIL. On success it deletes all but the newest 5 builds.
   On failure it deletes nothing and prints the exact one-line rollback command
   naming the previous build.
4. Confirm live from the server: `curl http://localhost:8080/health`.

**Rolling back.** Move the symlink and restart. The failure message prints this
line for you with the right build filled in:

```bash
sudo ln -sfn /opt/dndplatform/releases/<build>.jar /opt/dndplatform/current.jar && sudo chown -h dndapp:dndapp /opt/dndplatform/current.jar && sudo systemctl restart dndplatform
```
Rollback is deliberately manual. A failed health check is usually caused by
something other than the JAR, and swapping the build back would change the state of the machine before you start reading logs. Flyway migrations only run forward: rolling the build back does **not** roll the database back, so a build older than the last migration may refuse to start. Builds older than the last migration are not usable anyway resulting in only 5 builds being kept.

**When to deploy:**
Deploy after a merge to main rather than letting deploys pile up. The server
should never sit more than a story or two behind the repository, because a large
gap turns one deploy into several untested changes landing at once. Deploying is
required, not optional, when a story needs something that cannot be proven
locally — anything seen from a second person's perspective, anything where two
people need to stay in sync, anything that goes through the reverse proxy, and
anything that touches the live database rather than the local one.

The script and reference copies of the systemd unit and the Caddyfile are
version-controlled under `deploy/`. Keep the server's installed script in sync by
re-running the install command above after editing `deploy/deploy.sh`. If a repo
copy and the live file on the server ever differ, **the live file is correct** —
sync the repo copy to match it, not the other way round.
