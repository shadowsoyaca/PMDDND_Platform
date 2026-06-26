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
| Security / auth | Spring Security | Planned (Phase 2) |
| Database | PostgreSQL | In Use (Story 6) |
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

<!--
Note: build tool, database engine, and the React/UI libraries are listed
because the planning doc names them, but none are installed yet. Update the
Status column as each lands.
-->

---

## Prerequisites

What must be installed before the project will build and run:

- **JDK 17** — the project is locked to Java 17 (Story 4 / Story 5). Not a newer JDK.
  - Local (dev machine): Eclipse Temurin 17.0.19.
  - Server: Ubuntu OpenJDK 17.0.19 (headless). Both are OpenJDK 17 builds; the JAR is portable between them.
- **Git** + **GitHub Desktop** — version control and pushing to the repo.
- **VS Code** with the Java extensions (Extension Pack for Java; Spring Boot Extension Pack).
- **WSL (Ubuntu)** — local Linux environment mirroring the server.
- **PostgreSQL 16** — runs on the server (installed in Story 6). To browse/manage it from the dev machine, use **DBeaver** over an SSH tunnel (the database port is not exposed to the public internet).

---

## Getting Started / Setup

<!-- The Spring Boot project does not exist yet (Story 4). Fill these in as you build it. -->

1. **Clone the repository**
   ```bash
   git clone https://github.com/shadowsoyaca/PMDDND_Platform.git
   ```
2. **Open the project** in VS Code and confirm the JDK is set to **17**.
3. **Build the project**
   ```
   ./mvnw clean install
   ```
4. **Database** — PostgreSQL 16 is installed and running on the server with an empty
   `pmd_dnd` database and a dedicated app role (`pmd_app`). The application is **not yet
   wired to the database** (a later story). 
   
   When it is, the DB password is supplied at
   runtime (see Configuration) — never committed.

---

## Configuration

- **Secrets are kept OUT of version control.** Any config containing secrets
- **Runtime secrets (planned):** the database password will be retrieved at runtime
  from a **secrets manager** (accessed over its API) rather than stored in the repo.
  The manager's own bootstrap token is treated as a secret too (kept in an env file /
  environment variable that is git-ignored). The specific secrets-manager product is a
  decision deferred to the app-wiring story.
- **Server port:** 8080
- **Database connection (server-side):** PostgreSQL 16, database `pmd_dnd`, app role
  `pmd_app`, listening on `localhost:5432`. Reached from the dev machine through an SSH
  tunnel; port 5432 is **not** open to the internet. Credentials live in the password
  manager, not in any file here.

---

## Running the Application

<!-- Filled in during Story 4, when the health-check endpoint is built. -->

1. Start the app:
   ```
   ./mvnw spring-boot:run
   ```
2. Verify it's up by opening the health-check endpoint in a browser:
   ```
   http://localhost:8080/health
   ```
   A successful response looks like: PMD D&D Platform is up and running!.

---

## Project Structure

<!--
The folder/package layout is generated when the Spring Boot project is created
in Story 4. Fill in a brief map of the key folders once it exists.
-->

src/main/java/com/pmd/dndplatform/
    DndplatformApplication.java   – application entry point
    HealthController.java         – serves the /health endpoint
src/main/resources/
    application.yml               – app configuration (empty for now)
pom.xml                           – Maven build + dependencies
mvnw, mvnw.cmd, .mvn/             – Maven wrapper

---

## Roadmap & Status

**Current phase:** Phase 1 — Stand Up the Server & Prove Deployment

**Progress:** 

Story 1 (Provision the Server) ✅ 

Story 2 (Secure the Server) ✅ 

Story 3 (Code Repository) ✅ 

Story 4 (Minimal Spring Boot app)  ✅ 

Story 5 (Install Java on the server) ✅ 
 
Story 6 (Install the database on the server) ✅

Story 7 (Deploy and run the app on the server) ⏳ next

**Full phase plan:**

- **Phase 0 — Finish the Blueprint:** Complete the design and a single source-of-truth architecture document.
- **Phase 1 — Stand Up the Server & Prove Deployment:** Rent the VPS, install Java and the database, deploy an empty Spring Boot app reachable at the server. *(in progress)*
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
 
**Server runtime (Story 5):** the production droplet runs Ubuntu OpenJDK **17.0.19** (`openjdk-17-jdk-headless`), so it can execute the Spring Boot JAR. Confirmed via `java -version` / `javac -version`.
 
**Database (Story 6):** PostgreSQL **16** runs on the server as a systemd service, with an empty `pmd_dnd` database owned by the dedicated non-root role `pmd_app`. Not yet connected to the app.

[FILL IN: how the app is built, transferred, and run on the server. Add the
repeatable deploy steps once Story 10 establishes them.]
