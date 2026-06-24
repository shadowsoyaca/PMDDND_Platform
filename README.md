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
| Build tool | [FILL IN: decided when the Spring Boot project is generated in Story 4 — Maven or Gradle] | Pending |
| Security / auth | Spring Security | Planned (Phase 2) |
| Database | PostgreSQL **or** MySQL — *not yet chosen* | Pending (Story 6) |
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
- **Git** + **GitHub Desktop** — version control and pushing to the repo.
- **VS Code** with the Java extensions (Extension Pack for Java; Spring Boot Extension Pack).
- **WSL (Ubuntu)** — local Linux environment mirroring the server.
- [FILL IN: database — add once chosen and installed in Story 6 (PostgreSQL or MySQL).]

---

## Getting Started / Setup

<!-- The Spring Boot project does not exist yet (Story 4). Fill these in as you build it. -->

1. **Clone the repository**
   ```bash
   git clone shadowsoyaca/PMDDND_Platform
   ```
2. **Open the project** in VS Code and confirm the JDK is set to **17**.
3. **Build the project**
   ```
   [FILL IN: build command — set after the build tool is chosen in Story 4]
   ```
4. **Configure the database** — [FILL IN: once Story 6 is done.]

---

## Configuration

- **Secrets are kept OUT of version control.** Any config containing secrets
  (e.g. database credentials) is excluded via `.gitignore` and never committed.
  [FILL IN: name the local config file(s) once they exist.]
- **Server port:** [FILL IN: once the Spring Boot app is created in Story 4.]
- **Database connection:** [FILL IN: once chosen/installed in Story 6.]

---

## Running the Application

<!-- Filled in during Story 4, when the health-check endpoint is built. -->

1. Start the app:
   ```
   [FILL IN: run command]
   ```
2. Verify it's up by opening the health-check endpoint in a browser:
   ```
   [FILL IN: e.g. http://localhost:[port]/health]
   ```
   A successful response looks like: [FILL IN: expected status message].

---

## Project Structure

<!--
The folder/package layout is generated when the Spring Boot project is created
in Story 4. Fill in a brief map of the key folders once it exists.
-->

[FILL IN: brief map of key directories/packages after Story 4.]

---

## Roadmap & Status

**Current phase:** Phase 1 — Stand Up the Server & Prove Deployment
**Progress:** Story 1 (Provision the Server) ✅ · Story 2 (Secure the Server) ✅ · Story 3 (Code Repository) ✅ · Story 4 (Minimal Spring Boot app) ⏳ next

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

[FILL IN: how the app is built, transferred, and run on the server. Add the
repeatable deploy steps once Story 10 establishes them.]
