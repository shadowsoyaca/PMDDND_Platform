# Credits and Attributions

This file records every third-party asset, font, and library used in the PMD D&D
Platform, along with where it came from and the terms it is used under.

It exists so that the origin of each item is written down while it is still
known. Reconstructing where an asset came from months or years later is
difficult and often impossible, and an asset whose origin cannot be established
cannot be reasoned about at all.

**Maintaining this file:** add an entry when an asset, font, or icon set is
added to the project, not afterwards. Record the source URL even when the
licence is permissive, because the licence terms live at that URL and can be
checked again later. Where the origin is genuinely unknown, say so plainly
rather than leaving the item out.

Last reviewed: Phase 2 Story 5.

That story added one shadcn/ui component, `table.tsx`, and no artwork, fonts,
icons or dependencies. shadcn/ui generates its components as source files into
this repository rather than installing them, so the new file needs no entry of
its own beyond the existing shadcn/ui row and the note below it. Nothing was
added to `package.json` or `package-lock.json`.

---

## Table of Contents

1. [Artwork](#artwork)
2. [Fonts](#fonts)
3. [Icons](#icons)
4. [Software Dependencies](#software-dependencies)
5. [Notice on Pokémon Intellectual Property](#notice-on-pokémon-intellectual-property)

---

## Artwork

### Login screen backdrop

| | |
| --- | --- |
| **File** | `frontend/src/assets/login_backdrop.png` |
| **Asset pack** | Ocean and Clouds Free Pixel Art Backgrounds |
| **Author** | CraftPix.net |
| **Source** | https://craftpix.net/freebies/ocean-and-clouds-free-pixel-art-backgrounds/ |
| **Licence** | CraftPix free file licence. Royalty-free use in unlimited projects. |
| **Licence terms** | https://craftpix.net/file-licenses/ |
| **Modifications** | None. Used as supplied. |

Properly licensed for this use. Attribution is recorded here as good practice
rather than as a condition of the licence.

---

### Series logo

| | |
| --- | --- |
| **File** | `frontend/src/assets/title.png` |
| **Description** | Pokémon Mystery Dungeon series logo |
| **Rights holder** | Nintendo, Game Freak, The Pokémon Company, Spike Chunsoft |
| **Obtained from** | The Spriters Resource, Pokémon Mystery Dungeon: Red Rescue Team (Game Boy Advance) |
| **Source URL** | https://www.spriters-resource.com/game_boy_advance/pokemonmysterydungeonredrescueteam/asset/5413/ |
| **Licence** | None. Used without permission. |
| **Modifications** | Background removed to restore transparency; cropped to the artwork's bounds. |

The Spriters Resource is an archive of assets extracted from published games. It
hosts and indexes this material; it does not own it and does not grant rights to
it. See the notice at the end of this file.

---

### Explorer badge

| | |
| --- | --- |
| **File** | `frontend/src/assets/badge.png` |
| **Description** | Explorer badge emblem from the Pokémon Mystery Dungeon series |
| **Rights holder** | Nintendo, Game Freak, The Pokémon Company, Spike Chunsoft |
| **Obtained from** | The Explorers Guild (@ExplGuild) |
| **Source URL** | https://x.com/ExplGuild/status/1631178882832556032 |
| **Licence** | None. Used without permission. |
| **Modifications** | Cropped to the artwork's bounds. |

Posted by a community account rather than by a rights holder. Whether the image
was extracted from a game or redrawn is not established, so the underlying
design is treated as belonging to the rights holders named above. If the origin
is ever confirmed, update this entry.

---

## Fonts

### Geist

| | |
| --- | --- |
| **Used for** | All interface text |
| **Author** | Vercel |
| **Installed by** | The shadcn/ui "Nova" preset, during Phase 2 Story 4 setup |
| **Licence** | SIL Open Font License 1.1 |
| **Source** | https://github.com/vercel/geist-font |

Free to use, modify, and redistribute, including in a bundled application. The
licence requires the copyright notice and licence text to travel with the font
files.

**Open item:** the font files are currently served from the frontend bundle, and
the licence text is not shipped alongside them. Worth resolving during Phase 2
Story 10 or Phase 4 Story 1, whichever touches the typography first.

---

### Pokémon Mystery Dungeon typefaces

**Not yet in the project.** Recorded here in advance because they are planned for
Phase 2 Story 10.

Three typefaces from the Nintendo Switch release of the series are held locally
and are the intended starting point for theming. Game typefaces are ordinarily
licensed to the publisher rather than owned by them, which means they usually
cannot be redistributed even by the company that shipped the game.

**Before these are added to the repository:** identify each typeface by name and
determine whether it is a commercial face licensed to the publisher or one drawn
for the game. That distinction decides whether they can be bundled at all, and a
freely licensed lookalike may be the better answer. Fill in a full entry here at
that point.

---

## Icons

### Lucide

| | |
| --- | --- |
| **Used for** | Interface icons |
| **Installed by** | The shadcn/ui "Nova" preset, during Phase 2 Story 4 setup |
| **Licence** | ISC License |
| **Source** | https://lucide.dev |

Permissive. Free to use and modify, including commercially. Requires the
copyright notice to be retained, which the bundled package does.

---

## Software Dependencies

The project's dependencies are declared in two files, which are the authoritative
and always-current record:

| File | Covers |
| --- | --- |
| `pom.xml` | Backend dependencies, with versions resolved by the Spring Boot parent |
| `frontend/package-lock.json` | Frontend dependencies, with every transitive version pinned exactly |

Those files are not duplicated here. A hand-maintained list would fall out of
date on the next install and would be less accurate than the files themselves.

The principal frameworks and tools, with their licences:

The five test tools were added in Phase 2 Story 4.7. They are development
dependencies and appear in no built JAR, so they are never served to anyone.
They are recorded anyway, because this table covers what the project depends on
rather than only what reaches a browser.

The last two rows were added in Phase 2 Story 4.8, on the same reasoning. They
are used by the pull request checks and appear in nothing that is deployed, but
the project does depend on them. They are also the only entries here that are
not declared in `pom.xml` or `package-lock.json`, since a workflow file names
its own tools, so this table is the only record of them.

| Component | Purpose | Licence |
| --- | --- | --- |
| Spring Boot | Backend framework | Apache License 2.0 |
| Spring Security | Authentication and access control | Apache License 2.0 |
| Hibernate | Database access via JPA | LGPL 2.1 / Apache License 2.0 |
| Flyway | Database migrations | Apache License 2.0 |
| PostgreSQL | Database | PostgreSQL License |
| PostgreSQL JDBC Driver | Database connectivity | BSD 2-Clause |
| Maven | Build tool | Apache License 2.0 |
| React | Frontend library | MIT License |
| TypeScript | Language | Apache License 2.0 |
| Vite | Frontend build tool | MIT License |
| Node.js | Frontend build runtime | MIT License |
| Vitest | Frontend test runner | MIT License |
| React Testing Library | Rendering and querying components in tests | MIT License |
| jsdom | Fake browser the frontend tests run inside | MIT License |
| jest-dom | Page-shaped assertions for tests | MIT License |
| user-event | Simulated typing and clicking in tests | MIT License |
| Tailwind CSS | Styling | MIT License |
| shadcn/ui | Component source | MIT License |
| Radix UI | Component behaviour and accessibility | MIT License |
| React Router | Client-side routing | MIT License |
| Caddy | Reverse proxy and TLS | Apache License 2.0 |
| GitHub Actions (`actions/checkout`, `actions/setup-java`, `actions/setup-node`) | Steps used by the pull request checks | MIT License |
| PostgreSQL Docker image (`postgres:16`) | Throwaway database the pull request checks run against | PostgreSQL License |

All of the above are permissively licensed and may be used in a private
application without restriction.

Note on shadcn/ui: its components are generated into this repository as source
files rather than installed as a dependency. They are edited here directly and
do not appear in `package-lock.json`.

---

## Notice on Pokémon Intellectual Property

Pokémon, Pokémon Mystery Dungeon, and all related names, characters, artwork,
and audio are the property of Nintendo, Game Freak, Creatures Inc., The Pokémon
Company, and Spike Chunsoft.

This project is an unofficial fan work. It is not affiliated with, endorsed by,
or connected to any of those companies. The artwork listed above is used without
permission.

The platform is private and invite-only, is offered to a small group at no cost,
and is not distributed, published, or monetised in any form. It is built around
an original tabletop system rather than reproducing any published game.

**If the project's circumstances change** — public availability, distribution, or
any commercial element — the entries above are the list of items that would need
review.