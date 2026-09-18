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

A **journey** is one requirement document. It carries its user story, status, author, primary
source, the requirements themselves, the questions still open against it, the decisions carried
forward, technical notes, and the archive items deliberately not carried into it.

| Entity | Notes |
|---|---|
| **Persona** | Policy Viewer, Underwriter, Servicing Rep. Assigned to journeys, optionally overridden further down. |
| **Category** | The domain. Journeys belong to one; requirements reach it through their journey. |
| **Journey** | A document, `READ` or `WRITE`, with the user story and all the surrounding notes. |
| **Functional requirement** | Section, stable reference, status, priority, change class, `decisionRequired`, `stateSpecific`, source notes, links to other requirements, change history. |
| **Acceptance criterion** | Ordered children of a requirement, each with its own reference. |
| **Comment** | Free-form note on a journey, a requirement or a criterion. |
| **Question** | Tracked question with `Open` / `Answered` / `Deferred`, an answer and an optional assignee. The corpus's 56 open questions import as real records, surfaced across the project at `/questions`. |

## Persona inheritance

Personas attach to a **journey**. A **requirement** inherits them unless it declares its own, and a
**criterion** inherits the requirement's *resolved* set unless it declares its own. Declaring
personas replaces the inherited set entirely at that level.

There is no separate override flag: a non-empty `personas` relation *is* the override, and clearing
it reverts to inheritance. The rule lives in one place — `resolveRequirementPersonas` and
`resolveCriterionPersonas` in `src/lib/personas.ts` — and every view, filter and report goes through
it. The UI always shows which mode something is in: inherited personas render muted with an
`inherited` tag, overrides solid with `override` and a one-click *revert to inherited*.

In the imported corpus this falls out of the source: a requirement section marked `Policy change` is
carried out by the Underwriter and one marked `Servicing update` by the Servicing Rep, so those 47
requirements override; the other 70 inherit their journey's personas. Adding a persona to a journey
flows down to every inheriting requirement immediately and leaves the overriding ones alone.

## Stable references

`FR-<JOURNEY KEY>-<NNN>` — `FR-BED-001` on the Business Entity Data read journey, `FR-BEDW-001` on
its write side; criteria are `FR-BED-001.AC-01`. Assigned once from a monotonic per-prefix counter
(`RefCounter`) and never rewritten: moving a requirement to another journey keeps its reference and
records the move in the change history instead. Deleting one does not recycle its number.

## The corpus

`prisma/data/journeys.json` is the authored content, keys preserved verbatim from the source
(`window.REQUIREMENTS_DATA`); `prisma/data/types.ts` describes its shape and `prisma/data/mapping.ts`
holds the derivations — journey keys, persona splitting, change classes. `prisma/seed.ts` imports it
and is idempotent: journeys upsert on slug, requirements on their deterministic ref, and each
journey's children are replaced on every run, including any requirement that was moved elsewhere in
the app since the last seed.

Re-running the seed restores the corpus exactly; your own comments on requirements and criteria
survive, journey-level questions and comments do not.

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
src/lib/personas.ts       persona resolution — the single source of truth for inheritance
src/lib/refs.ts           stable reference generation
src/lib/changelog.ts      before/after diffing into change-history rows
src/lib/validation.ts     Zod schemas shared by forms and server actions
src/lib/queries.ts        reusable Prisma includes and read helpers
src/lib/actions/          server actions, one module per entity
src/app/                  dashboard, journeys, requirements, personas, domains, questions
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
- Deleting a journey cascades to its requirements, criteria, notes and questions. Deleting a persona
  only removes the assignment. A domain holding journeys refuses to delete.
