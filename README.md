# PMD D&D Platform

> [FILL IN: one-line description. e.g. "A private web application blending Pokémon Mystery Dungeon mechanics with D&D tabletop play."]

<!--
HOW TO USE THIS TEMPLATE
- Sections marked [FILL IN] are for you to complete.
- Pre-filled content is drawn ONLY from the Phase 1 User Stories and the
  Requirements / Tooling / Phases document. Anything not yet decided or
  not yet built is left as a placeholder on purpose.
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
| Database | PostgreSQL | In Use (Phase 1 Story 6) and Wired to App (Phase 2 Story 3) |
| Schema migrations | Flyway | In use (Phase 2 Story 3) |
| ORM / data access | Spring Data JPA (Hibernate) | In use (Phase 2 Story 3) |
| Frontend | React + TypeScript | Planned (Phase 2) |
| UI styling / components | Tailwind CSS / MUI / shadcn/ui | Planned |
| Hover tooltips | Radix UI / Tippy.js | Planned (Phase 4) |
| Animations | Motion (Framer Motion) | Planned (Phase 9) |
| Audio | Web Audio API | Planned (Phase 9) |
| Real-time | Spring WebSocket + browser WebSocket | Planned (Phase 6) |
| DB management (dev) | DBeaver | Dev tool |
| Version control | Git + GitHub | In use |
| IDE | VS Code | In use |
| Local Linux environment | WSL (Ubuntu) | In use |
| File transfer to server (optional) | WinSCP | Optional |
| Reverse Proxy / TLS | Caddy | In use (Phase 2 Story 1) |

<!--
Note: build tool, database engine, and the React/UI libraries are listed
because the planning doc names them, but none are installed yet. Update the
Status column as each lands.
-->

---

## Prerequisites

What must be installed before the project will build and run:

- **JDK 17** — the project is locked to Java 17 (Phase 1 Story 4 / Phase 1 Story 5). Not a newer JDK.
  - Local (dev machine): Eclipse Temurin 17.0.19.
  - Server: Ubuntu OpenJDK 17.0.19 (headless). Both are OpenJDK 17 builds; the JAR is portable between them.
- **Git** + **GitHub Desktop** — version control and pushing to the repo.
- **VS Code** with the Java extensions (Extension Pack for Java; Spring Boot Extension Pack).
- **WSL (Ubuntu)** — local Linux environment mirroring the server.
- **PostgreSQL 16** — runs on the server (installed in Phase 1 Story 6) AND on the dev machine (added in Phase 2 Story 3, so the app can be built and tested locally). On the dev machine, create two databases owned by the `pmd_app` role: `pmd_dnd` (real) and `pmd_dnd_test` (used by the test suite, which wipes it constantly). To browse/manage the server database from the dev machine, use **DBeaver** over an SSH tunnel (the database port is not exposed to the public internet).

---

## Getting Started / Setup

<!-- The Spring Boot project does not exist yet (Phase 1 Story 4). Fill these in as you build it. -->

1. **Clone the repository**
   ```bash
   git clone https://github.com/shadowsoyaca/PMDDND_Platform.git
   ```
2. **Open the project** in VS Code and confirm the JDK is set to **17**.
3. **Build the project**
   ```
   ./mvnw clean install
   ```
4. **Database** — the app is now connected to PostgreSQL 16 (Phase 2 Story 3).
   - On the dev machine, install PostgreSQL 16 locally and create the `pmd_app` role plus two databases: `pmd_dnd` and `pmd_dnd_test`.
   - Flyway creates the tables on first startup; you never run the table SQL by hand.
   - The DB password is supplied at runtime through the `DB_PASSWORD` environment variable (see Configuration) and is never committed.

---

## Configuration

- **Secrets are kept OUT of version control.** Any config containing secrets
- **Runtime secrets (planned):** the database password will be retrieved at runtime
  from a **secrets manager** (accessed over its API) rather than stored in the repo.
  The manager's own bootstrap token is treated as a secret too (kept in an env file /
  environment variable that is git-ignored). The specific secrets-manager product is a
  decision deferred to the app-wiring story.
- **Database password (Phase 2 Story 3):** supplied at runtime through the
  `DB_PASSWORD` environment variable. Locally it is a Windows user environment
  variable; on the server it comes from a root-only env file read by systemd
  (see Deployment). Never committed.
- **Owner account (Phase 2 Story 3):** the owner is now a real row in the
  database, not an in-memory account. On first startup, if no user has the
  owner's username, one is created (seeded) from three environment variables.
  If the row already exists, the variables are ignored — changing them does
  NOT change your stored password. To reset yourself, delete your row and
  restart.
  - `APP_OWNER_USERNAME` = the owner's login name.
  - `APP_OWNER_PASSWORD_HASH` = the BCrypt hash of the password. Generate it by
    running `com.pmd.dndplatform.tools.PasswordHashGenerator` on your own
    machine, which prints a hash you paste in. The plain password never leaves
    your machine and is never committed.
  - Locally, set both in your run config (VS Code `.vscode/launch.json`, which is
    git-ignored). The app will not start if they are missing, which is on purpose.
- **Session cookie (Phase 2 Story 2):** the login cookie is set to `http-only`
  and `same-site: lax`. The `Secure` flag is added automatically when traffic is
  https (it is in production, via the reverse proxy), and skipped on local http
  so testing still works.
- **Server port:** 8080
- **Database connection (server-side):** PostgreSQL 16, database `pmd_dnd`, app role
  `pmd_app`, listening on `localhost:5432`. Reached from the dev machine through an SSH
  tunnel; port 5432 is **not** open to the internet. Credentials live in the password
  manager, not in any file here.

---

## Running the Application

<!-- Filled in during Story 4, when the health-check endpoint is built. -->

1. Set the environment variables first (see Configuration): `DB_PASSWORD`,
   `APP_OWNER_USERNAME`, `APP_OWNER_PASSWORD_HASH`, and `APP_OWNER_PERSON_NAME`.
   The app will not start without them.
2. Start the app:
   ```
   ./mvnw spring-boot:run
   ```
   (In VS Code, press F5 with the app's launch config selected, so the two
   variables are picked up.)
3. Verify it's up by opening the health-check endpoint in a browser:
   ```
   http://localhost:8080/health
   ```
   A successful response looks like: PMD D&D Platform is up and running!.
   This works locally because /health is allowed for requests from the machine
   itself. From Story 2 on, every other route sends a logged-out visitor to the
   login page, and outside requests to /health are blocked.

---

## Project Structure

<!--
The folder/package layout is generated when the Spring Boot project is created
in Story 4. Fill in a brief map of the key folders once it exists.
-->

src/main/java/com/pmd/dndplatform/

    DndplatformApplication.java

    - application entry point

    HealthController.java

    - serves the /health endpoint

    config/

        SecurityConfig.java

        - Spring Security setup: BCrypt, the in-memory owner account,
          default-deny on every route, localhost-only /health, form login

    user/

        Role.java              - the account roles (OWNER, PLAYER)

        User.java              - one row of the users table

        UserRepository.java    - database access for users

        DatabaseUserDetailsService.java - looks up logins in the database

        OwnerBootstrap.java    - seeds the owner row on first startup

        UserAdminService.java  - the account rules (create/list/update/delete
         + guards)

        UserAdminController.java - the /api/admin/users endpoints

        dto/

            CreateUserRequest.java  - incoming: new account fields

            UpdateUserRequest.java  - incoming: person-name change

            UserSummary.java        - outgoing: safe account fields (never the hash)

    tools/

        PasswordHashGenerator.java

        - dev helper, not part of the running app. Turns a password into a
          BCrypt hash you paste into APP_OWNER_PASSWORD_HASH

src/main/resources/

    application.yaml

    - real config: forwarded headers, loopback bind, session cookie
      hardening, and the owner credential env-var references
   
    db/migration/

       V1__create_users_table.sql

        - Flyway migration that creates the users table

src/test/java/com/pmd/dndplatform/

    DndplatformApplicationTests.java

    - basic context-loads check

    SecurityConfigTest.java

    - proves the Story 2 security rules (now via database login)
    
    UserAdminTest.java

    - proves the Story 3 account rules: create/list/update/delete, role
      enforcement, hash-not-password storage, and the delete guards


src/test/resources

    application-test.yaml

    - points tests at the pmd_dnd_test database


pom.xml

 - Maven build + dependencies

mvnw, mvnw.cmd, .mvn/

 - Maven wrapper

deploy/

    deploy.sh

    - server-side deploy script (Phase 1 Story 10)
    dndplatform.service

    - reference copy of the systemd unit
    Caddyfile

    - reference copy of the reverse proxy config

---

## Roadmap & Status

**In Progress:** Phase 1 — Stand Up the Server & Prove Deployment

**Progress:** 

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

Story 11 (Point a domain at the server) ⏸ deferred to project end — avoids paying yearly domain cost while the project is far from done; app runs on its raw IP in the meantime

Story 12 (Enable HTTPS) ⏸ deferred to project end — a self-signed reverse proxy is stood up early in Phase 2 to establish the production topology; the trusted Let's Encrypt certificate + domain land at the end, alongside Story 11

*Note: Story 9 was done before Story 8 on purpose — stand up the durable
background service first, then expose it, so the public port is never backed
by a fragile foreground process.*

---

**In Progress** Phase 2 - Lock the Door

Story 1 (Reverse proxy, self-signed TLS) ✅

Story 2 (Secure every route with Spring Security) ✅

Story 3 (Owner-created user accounts, database-backed) ✅


---

**Full phase plan:**

- **Phase 0 — Finish the Blueprint:** Complete the design and a single source-of-truth architecture document.
- **Phase 1 — Stand Up the Server & Prove Deployment:** Rent the VPS, install Java and the database, deploy an empty Spring Boot app reachable at the server. *(core complete - Stories 11-12 deferred to project end)*
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

<!-- Filled in around Story 7 / Story 10, when the deploy process actually exists. -->
 
**Server runtime (Phase 1 Story 5):** the production droplet runs Ubuntu OpenJDK **17.0.19** (`openjdk-17-jdk-headless`), so it can execute the Spring Boot JAR. Confirmed via `java -version` / `javac -version`.
 
**Database (Phase 1 Story 6):** PostgreSQL **16** runs on the server as a systemd service, with an empty `pmd_dnd` database owned by the dedicated non-root role `pmd_app`.

**Runtime secrets on the server (Phase 2 Story 3):** the app reads `DB_PASSWORD`,
`APP_OWNER_USERNAME`, `APP_OWNER_PASSWORD_HASH`, and `APP_OWNER_PERSON_NAME` from a
root-only environment file at `/etc/dndplatform/dndplatform.env` (permissions `600`,
owned by root). The systemd unit loads it with an `EnvironmentFile=` line. systemd
reads the file as root before handing control to the app, so the values never appear
in the repo, in the service file, or in a process listing. On first startup Flyway
creates the users table and the owner account is seeded; no manual SQL is needed.

**Build & transfer (Phase 1 Story 7):**
1. Build the executable JAR on the dev machine, from the repo root:
   `.\mvnw.cmd clean package` → produces `target\dndplatform-0.0.1-SNAPSHOT.jar`
   (a single runnable "fat" JAR).
2. Copy it to the server and place it in the app directory:
   `scp target\dndplatform-0.0.1-SNAPSHOT.jar matthew@<server-ip>:~/`
   `sudo mv ~/dndplatform-0.0.1-SNAPSHOT.jar /opt/dndplatform/dndplatform.jar`
   `sudo chown dndapp:dndapp /opt/dndplatform/dndplatform.jar`

**Run as a managed service (Phase 1 Story 9):**
The app runs under systemd as `dndplatform.service`, executing as the dedicated,
no-login system account `dndapp`, with the JAR at `/opt/dndplatform/dndplatform.jar`.
The unit is enabled (starts on boot), auto-restarts on failure, and is hardened
(`NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`).
- Status:  `sudo systemctl status dndplatform`
- Logs:    `journalctl -u dndplatform -f`
- Restart: `sudo systemctl restart dndplatform`
- Health:  `curl http://<droplet-IP>/health` → "PMD D&D Platform is up and running!"

**Public access (Phase 1 Story 8):** UFW now allows `8080/tcp` (`sudo ufw allow 8080/tcp`),
so the app is reachable from the public internet at `http://<droplet-public-IP>:8080/health`.
Confirmed loading from a separate device on the LAN, from a phone on cellular (a
different network), and from a friend's device on their own network. Tomcat binds to
all interfaces (`*:8080`), and the only public layer is UFW — no DigitalOcean Cloud
Firewall is attached. The `/health` response is a non-sensitive plain string; there is
no login or database wiring behind the port yet, which is why Spring Security (Phase 2)
and HTTPS (Phase 1 Story 12) precede any real data going live. Database port `5432` remains
closed to the internet.

**Repeatable deploy process (Phase 1 Story 10):** the build → transfer → restart
sequence is now a documented routine backed by a server-side script in `deploy/`.

One-time install of the script on the server (re-run whenever `deploy.sh` changes):
```
sudo install -m 0755 ~/deploy.sh /usr/local/bin/dndplatform-deploy
```

Each deploy:
1. Dev machine (Windows PowerShell, from the repo root):
   `.\mvnw.cmd clean package` → `target\dndplatform-0.0.1-SNAPSHOT.jar`
2. Upload it:
   `scp target\dndplatform-0.0.1-SNAPSHOT.jar matthew@<server-ip>:~/`
3. Server:
   `sudo dndplatform-deploy`
   The script installs the uploaded JAR as `/opt/dndplatform/dndplatform.jar`
   (owned by `dndapp`), restarts `dndplatform.service`, polls
   `http://localhost:8080/health`, and reports PASS/FAIL. It saves the previous
   JAR as `dndplatform.jar.bak` and, on failure, prints the one-line manual
   restore command. (Full versioned rollback is a deferred refinement.)
4. Confirm live in a browser: `http://<droplet-IP>/health`.

The script and a reference copy of the systemd unit are version-controlled under
`deploy/`. Keep the server's installed script in sync by re-running the install
command above after editing `deploy/deploy.sh`.