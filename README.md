# Requirements Documentation

An application for managing software requirements, loaded with the workers-comp policy requirements
corpus: 12 journey documents, 117 functional requirements and 254 acceptance criteria.

## Quick start

```bash
npm install
npm run setup   # generate the Prisma Client, apply migrations, import the corpus
npm run dev     # http://localhost:3000
```

Other scripts: `npm test` (Vitest), `npm run build`, `npm run db:studio` (Prisma Studio),
`npm run db:seed` (re-import the corpus).

### After pulling a schema change

The Prisma Client is generated into `node_modules`, so it is a build artifact rather than source and
an existing checkout can end up holding a copy that predates the schema. `npm install` regenerates it
via `postinstall`, and `npm run setup` and `npm run db:seed` regenerate it before they run — so
either of those is enough. On its own, `npx prisma db seed` is not: it will fail with
`Cannot read properties of undefined`, and the seeder says so and tells you to run `npx prisma
generate`.

## How the content is organised

```
Domain (Category)          Business Entity Data, Claims, Rating…          7
  └─ Journey               one document — a domain's read or write side   12
       └─ Requirement      grouped into the document's sections           117
            └─ Criterion   acceptance criteria, in document order         254
```

Two things cut across that tree rather than sitting in it:

```
Capability → Role          one permission; roles are configured sets of them   3 / 3
Project                    collects domains, journeys and single requirements  1
```

A **journey** is one requirement document. It carries its user story, status, author, primary
source, the requirements themselves, the questions still open against it, the decisions carried
forward, technical notes, and the archive items deliberately not carried into it.

| Entity | Notes |
|---|---|
| **Capability** | One permission — an action on a resource (`View policy`, `Change policy`, `Update servicing details`). Assigned to journeys, optionally overridden further down. |
| **Role** | Policy Viewer, Underwriter, Servicing Rep: a configured set of capabilities, and nothing else. |
| **Project** | A cross-cutting collection of domains, journeys and individual requirements. |
| **Category** | The domain. Journeys belong to one; requirements reach it through their journey. |
| **Journey** | A document, `READ` or `WRITE`, with the user story and all the surrounding notes. |
| **Functional requirement** | Section, stable reference, status, priority, change class, `decisionRequired`, `stateSpecific`, source notes, links to other requirements, change history. |
| **Acceptance criterion** | Ordered children of a requirement, each with its own reference. |
| **Comment** | Free-form note on a journey, a requirement or a criterion. |
| **Question** | Tracked question with `Open` / `Answered` / `Deferred`, an answer and an optional assignee. The corpus's 56 open questions import as real records, surfaced across the app at `/questions`. |

## Capabilities, and the roles that hold them

Requirements are written against **capabilities** — permissions, in the RBAC sense — not against the
people who hold them. A capability is an action on a resource: `UPDATE` on *Coverage, exposure and
rating*. A **role** is a configured set of capabilities and nothing else:

| Role | Capabilities |
|---|---|
| Policy Viewer | View policy |
| Underwriter | View policy, Change policy |
| Servicing Rep | View policy, Update servicing details |

Nothing in the document tree points at a role. A role reaches a journey, requirement or criterion
exactly when one of its capabilities does, so re-configuring a role changes its coverage without
touching a single requirement — `/roles/<id>` edits the grant in place and the coverage list below it
moves. A requirement page shows the roles that can exercise what it describes, marking a role
`partial` when it grants only some of the capabilities in play. The derivation lives in
`src/lib/roles.ts`; a role is never stored on a requirement.

### Capability inheritance

Capabilities attach to a **journey**. A **requirement** inherits them unless it declares its own, and
a **criterion** inherits the requirement's *resolved* set unless it declares its own. Declaring
capabilities replaces the inherited set entirely at that level.

There is no separate override flag: a non-empty `capabilities` relation *is* the override, and
clearing it reverts to inheritance. The rule lives in one place — `resolveRequirementCapabilities`
and `resolveCriterionCapabilities` in `src/lib/capabilities.ts` — and every view, filter and report
goes through it. The UI always shows which mode something is in: inherited capabilities render muted
with an `inherited` tag, overrides solid with `override` and a one-click *revert to inherited*.

In the imported corpus this falls out of the source: a requirement section marked `Policy change`
exercises *Change policy* and one marked `Servicing update` exercises *Update servicing details*, so
those 47 requirements override; the other 70 inherit their journey's capabilities. Adding a
capability to a journey flows down to every inheriting requirement immediately and leaves the
overriding ones alone.

The corpus names actors rather than permissions ("Underwriter (Policy change)"), so the seeder maps
each named actor to the one permission it is on the document to exercise, and rebuilds the actor as a
role over the wider set it holds (`prisma/data/mapping.ts`).

## Projects

A project **collects** work rather than owning it. Membership is many-to-many at three levels — a
whole domain, a single journey document, or one requirement out of a document — so the same domain
can sit in several projects and deleting a project leaves every member exactly where it was.

That makes "is this requirement in the project?" a rule rather than a column, and both the Prisma
filter and the in-memory check come from `src/lib/projects.ts` so a query and a badge cannot
disagree. Each requirement is tagged with how it got there: *added directly*, *through its journey*
or *through its domain*, most specific first.

`/projects/<slug>` rolls up everything the project reaches — requirements, criteria, decisions
outstanding, open questions, the status and priority mix — and edits membership at all three levels
in one place. The requirements list filters by project, and by capability or role.

The corpus seeds as one project holding all seven domains; add a second in the app to slice it by
release or workstream.

## Stable references

`FR-<JOURNEY KEY>-<NNN>` — `FR-BED-001` on the Business Entity Data read journey, `FR-BEDW-001` on
its write side; criteria are `FR-BED-001.AC-01`. Assigned once from a monotonic per-prefix counter
(`RefCounter`) and never rewritten: moving a requirement to another journey keeps its reference and
records the move in the change history instead. Deleting one does not recycle its number.

## The corpus

`prisma/data/journeys.json` is the authored content, keys preserved verbatim from the source
(`window.REQUIREMENTS_DATA`); `prisma/data/types.ts` describes its shape and `prisma/data/mapping.ts`
holds the derivations — journey keys, capability splitting, role configuration, change classes. `prisma/seed.ts` imports it
and is idempotent: journeys upsert on slug, requirements on their deterministic ref, and each
journey's children are replaced on every run, including any requirement that was moved elsewhere in
the app since the last seed.

Re-running the seed restores the corpus exactly, including each role's capability configuration and
the project over the domains; your own comments on requirements and criteria survive, journey-level
questions and comments do not.

## Change history

Mutating actions pass before/after snapshots through `diffEntity` (`src/lib/changelog.ts`), so
history is derived rather than hand-written. Requirement pages show their own history plus their
criteria's; the dashboard shows the most recent entries across everything.

## Stack

Next.js 15 (App Router, server actions) · Prisma over SQLite · Tailwind CSS v4 · Zod · Vitest.

`DATABASE_URL` in `.env` points at `./prisma/dev.db`. Moving to Postgres is a `datasource` provider
change plus a fresh migration; no application code assumes SQLite.

## Layout

```
prisma/schema.prisma      data model and the inheritance rule, documented in comments
prisma/data/              the corpus, its types and the derivations the seeder uses
prisma/seed.ts            importer
src/lib/capabilities.ts   capability resolution — the single source of truth for inheritance
src/lib/roles.ts          role coverage, derived from the capabilities a role grants
src/lib/projects.ts       project membership across domains, journeys and requirements
src/lib/refs.ts           stable reference generation
src/lib/changelog.ts      before/after diffing into change-history rows
src/lib/validation.ts     Zod schemas shared by forms and server actions
src/lib/queries.ts        reusable Prisma includes and read helpers
src/lib/actions/          server actions, one module per entity
src/app/                  dashboard, projects, journeys, requirements, capabilities, roles, domains, questions
src/components/           shared UI
```

## Notes

- Single user, no authentication. The name attached to comments and answers is held in
  `localStorage` and set in the header; swapping `useAuthorName` (`src/lib/author.ts`) for a session
  lookup is the whole change needed to move to real accounts.
- Comments and questions attach to exactly one parent — a journey, a requirement *or* a criterion.
  SQLite cannot add a `CHECK` constraint after the fact, so that invariant is enforced by the shared
  Zod refinement in `src/lib/validation.ts`.
- Nothing in the corpus maps to MoSCoW priority, so all 117 requirements import as *Should have* and
  the field is yours to triage in the app.
- Deleting a journey cascades to its requirements, criteria, notes and questions. Deleting a
  capability only removes the assignment, and drops it from any role granting it. Deleting a role or
  a project removes nothing else at all. A domain holding journeys refuses to delete.
- The migration that introduced capabilities carries the old persona assignments across rather than
  dropping them: each persona row became the permission it stood for, and every journey, requirement
  and criterion assignment came with it.
