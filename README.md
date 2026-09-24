# PMD D&D Platform

> A private web application blending Pokémon Mystery Dungeon mechanics with D&D tabletop play.

---

## Overview

A private, invite-only web application for running a tabletop role-playing game
built on Pokémon Mystery Dungeon. It tracks the parts of the game a person
should not have to track by hand: character sheets, calculations, status
effects, and the state of a session as it unfolds. There is no sign-up page.
The owner creates every account, and the audience is one small group of
friends. The rules are an original system designed alongside the software, and
the platform performs the maths and enforces the mechanics itself.

---

## Tech Stack

| Area | Choice | Status |
|------|--------|--------|
| Backend | Java 17 + Spring Boot | In use |
| Build tool | Maven | In use |
| Security | Spring Security | In use |
| Database | PostgreSQL 16 | In use |
| Schema migrations | Flyway | In use |
| Data access | Spring Data JPA (Hibernate) | In use |
| Frontend | React + TypeScript | In use |
| Frontend build | Vite + Node.js, run by Maven during `package` | In use |
| Frontend tests | Vitest + React Testing Library | In use |
| Pull request checks | GitHub Actions and CodeQL | In use |
| Styling and components | Tailwind CSS + shadcn/ui, with Radix UI underneath | In use |
| Reverse proxy and TLS | Caddy | In use |
| Tools | Git + GitHub Desktop, VS Code, WSL (Ubuntu), DBeaver | In use |
| Animations | Motion (Framer Motion) | Planned (Phase 9) |
| Audio | Web Audio API | Planned (Phase 9) |
| Real-time | Spring WebSocket | Planned (Phase 6) |

---

## Prerequisites

- **JDK 17.** The project is locked to Java 17. Eclipse Temurin locally, Ubuntu OpenJDK on the server.
- **Node.js 24 and npm 11.** Maven downloads its own pinned copy for a build, but the frontend tests only run through npm.
- **PostgreSQL 16** with a `pmd_app` role that owns two databases: `pmd_dnd` and `pmd_dnd_test`.
- **Git and GitHub Desktop.**
- **VS Code** with the Extension Pack for Java and the Spring Boot Extension Pack.
- **WSL (Ubuntu)** for `scp` to the server.
- **DBeaver** to browse the server database over an SSH tunnel.

---

## Getting Started

1. Clone `https://github.com/shadowsoyaca/PMDDND_Platform.git` and open it in VS Code with the JDK set to 17.
2. Create the `pmd_app` role and the two databases in PostgreSQL. Flyway creates the tables on first start.
3. Set the four environment variables listed under Configuration.
4. Build both halves. PowerShell, from the repository root:
   ```
   .\mvnw.cmd clean package
   ```
   The first run downloads Node into `frontend/node/`. Later runs take about three minutes.

---

## Configuration

Every secret reaches the application through an environment variable. No file
in the repository holds one, and `.env` files and `.vscode/` are git-ignored.

- `DB_PASSWORD`: the `pmd_app` database password.
- `APP_OWNER_USERNAME`, `APP_OWNER_PASSWORD_HASH`, `APP_OWNER_PERSON_NAME`: seed the owner account on first start. The hash comes from running `PasswordHashGenerator` locally. Once the row exists the variables are ignored.
- Locally, set all four as Windows user variables and in `.vscode/launch.json`. On the server they come from a root-only file read by systemd.
- The application refuses to start if any of the four is missing.
- Port 8080. On the server it binds to `127.0.0.1` only, behind Caddy on 443. The session cookie is `http-only` and `same-site: lax`, with `Secure` added under https.

---

## Running the Application

1. Press F5 in VS Code with the application's launch config selected, or run `.\mvnw.cmd spring-boot:run` from the repository root in PowerShell. The Maven route serves no frontend, so run `npm run dev` from `frontend/` beside it.
2. Check `http://localhost:8080/health`. It answers with the version and build time from the last Maven build, or `development build, not produced by Maven` under F5.
3. Open `http://localhost:8080/`. A logged-out visitor lands on the login screen. Signing in shows the owner's landing, with a link to the account table at `/accounts`, or a player's landing without it.
4. Test in a private browsing window so an old session cookie does not carry over.

---

## Running the Tests

Two commands, both run at the testing step of every story. Neither runs the other.

**Backend.** PowerShell, from the repository root. 52 tests, about forty seconds. Builds no frontend.

```
.\mvnw.cmd test
```

**Frontend.** PowerShell, from `frontend/`. 60 tests, about fifteen seconds, or closer to a minute on the first run after a Maven `package`. Runs every `*.test.ts` and `*.test.tsx` file under `frontend/` once and exits. `npx vitest` watches instead.

```
npm test
```

**The package build runs both.** `.\mvnw.cmd clean package` runs the frontend tests as well and produces no JAR if any fail. `.\mvnw.cmd test` does not run them.

Tests sit beside the screen they test, as `LoginPage.test.tsx` next to `LoginPage.tsx`. Shared pieces are in `frontend/src/test/`.

---

## Pull Request Checks

Every pull request to `main` runs five checks on clean Linux machines. All five are required by the branch protection rule on `main`, matched by name, so renaming a job removes it from the rule without warning.

| Check | Workflow | What it runs |
|-------|----------|--------------|
| `Backend tests` | `pr-checks.yml` | `./mvnw --batch-mode test` against a throwaway PostgreSQL 16 container |
| `Frontend tests` | `pr-checks.yml` | `npm ci`, `npm run build`, `npm test` |
| `CodeQL Java` | `codeql.yml` | Compiles the backend, then scans the Java |
| `CodeQL JavaScript and TypeScript` | `codeql.yml` | Scans the frontend source |
| `CodeQL` | added by GitHub | Fails if the pull request introduces a new alert of high severity or above |

`codeql.yml` also runs on every push to `main` and once a week. Findings are listed under the repository's Security tab, beside the Dependabot alerts. Secret scanning with push protection is switched on in the repository settings.

**When a check fails.**

1. Open the pull request's Checks tab and expand the red step.
2. Reproduce it locally with the matching command from Running the Tests.
3. If it passes locally and fails on GitHub, look for a file that was never committed or a filename whose capitalisation differs from the import.
4. Push a fix to the same branch. Every check re-runs on its own.

---

## Project Structure

```
src/main/java/com/pmd/dndplatform/
    config/            Spring Security, CSRF, the refusal handler, and React address forwarding
    user/              the users table, login, the owner seed, and the account endpoints
    user/dto/          the request and response shapes for those endpoints
    tools/             PasswordHashGenerator, a local helper that is not part of the running app
src/main/resources/
    application.yaml   runtime configuration
    db/migration/      Flyway migrations
    static/            empty in git. The built frontend is copied here during a build
src/test/java/com/pmd/dndplatform/   backend tests
src/test/resources/                  test configuration, pointing at pmd_dnd_test
frontend/
    src/pages/         one file per screen, with its tests beside it
    src/components/    pieces shared by more than one screen
    src/components/ui/ shadcn/ui components, owned here and meant to be edited
    src/lib/           the calls to the server and the helpers that read its answers
    src/test/          shared test setup. Nothing here is a test itself
    src/assets/        images
    dist/, node_modules/, node/   generated and git-ignored
.github/workflows/     pr-checks.yml and codeql.yml
deploy/                deploy script and reference copies of the systemd unit and Caddyfile
docs/                  DEPLOY.md
CREDITS.md             every third-party asset, with its source and licence
```

---

## Roadmap and Status

**Complete:** Phase 1, Stand Up the Server and Prove Deployment (core)

Story 1 (Provision the Server) ✅

Story 2 (Secure the Server) ✅

Story 3 (Code Repository) ✅

Story 4 (Minimal Spring Boot app) ✅

Story 5 (Install Java on the server) ✅

Story 6 (Install the database on the server) ✅

Story 7 (Deploy and run the app on the server) ✅

Story 8 (Make the app reachable from the internet) ✅

Story 9 (Run the app as a managed service) ✅

Story 10 (Establish a repeatable deployment process) ✅

Story 11 (Point a domain at the server) ⏸ deferred until a domain is bought

Story 12 (Enable HTTPS) ⏸ deferred. The early half, a self-signed reverse proxy, shipped as Phase 2 Story 1

---

**In Progress:** Phase 2, Lock the Door (First Vertical Slice)

Story 1 (Reverse proxy, self-signed TLS) ✅

Story 2 (Secure every route with Spring Security) ✅

Story 3 (Owner-created user accounts, database-backed) ✅

Story 3.5 (Fast rollback with versioned JARs) ✅

Story 4 (Login screen as the only public surface) ✅

Story 4.5 (Health endpoint reports the real build) ✅

Story 4.7 (Frontend test framework) ✅

Story 4.8 (Both test suites run on every pull request) ✅

Story 5 (Owner user management screen and role-based landing) ✅

Story 5.5 (Replace form login with a JSON endpoint) ✅

Story 5.8 (Turn off lazy CSRF token creation and delete CsrfCookieFilter) ✅

Story 5.9 (Static code and dependency scanning on every pull request) ✅

Stories 6a to 6d (Device-bound passkey cluster) ⏸ deferred until a domain is bought

Story 7 (Password change and reset) ⏸ deferred

Story 8 (Enable and disable accounts) ⏸ deferred

Story 9 (Grant and revoke DM access) ⏸ deferred

Story 10 (Theme the login screen) ⬜

Story 13 (OpenAPI specification and generated frontend types) ⬜ planned next after Story 5.9

---

**Full phase plan:**

- **Phase 0, Finish the Blueprint:** Complete the design and a single source-of-truth architecture document.
- **Phase 1, Stand Up the Server and Prove Deployment:** Rent the VPS, install Java and the database, deploy an empty Spring Boot app reachable at the server. *(core complete, Stories 11 and 12 deferred)*
- **Phase 2, Lock the Door (First Vertical Slice):** Spring Security on every route, hashed passwords, no public signup, login screen, React frontend skeleton, full browser to API to database loop.
- **Phase 3, Build the Data Backbone:** Definition and instance schema and the DM CSV-import GUI for bulk data.
- **Phase 4, Character Data and Display (No Combat):** The read-only character sheet, hover tooltips, drop-downs. Opens with Story 1, building the design system, so components are styled once rather than restyled later.
- **Phase 5, The Calculation Engine:** Damage maths, modifier stacking and tracking, standardised Pokémon generator. Pure backend logic.
- **Phase 6, The Real-Time Spine:** WebSockets. The DM changes a value and everyone's screen updates instantly.
- **Phase 7, Battle:** On-turn and off-turn battle screens, dice rolling, turn flow, knockback.
- **Phase 8, The World and Rules-Heavy Systems:** Town navigation, shops, base-building, crafting, class gimmicks, resting, inventory mechanics.
- **Phase 9, Make It Lively:** Full audio system and animations, deliberately last.

---

## Deployment

Full detail, including the one-time server setup and rolling back, is in `docs/DEPLOY.md`.

1. PowerShell, from the repository root: `.\mvnw.cmd clean package` produces `target\dndplatform-<version>.jar`.
2. WSL Ubuntu, from the repository root under `/mnt/c/`: `scp target/dndplatform-<version>.jar matthew@<server-ip>:~/`
3. Server, over SSH: `sudo dndplatform-deploy`. It places the build in `/opt/dndplatform/releases/`, moves the `current.jar` symlink, restarts `dndplatform.service`, polls `/health`, and reports PASS or FAIL.
4. Confirm on the server with `curl http://localhost:8080/health`, which names the version and build time.

Deploy after every merge to `main`. The installed script is a copy of `deploy/deploy.sh`, so re-run the install command in `docs/DEPLOY.md` after changing it.
