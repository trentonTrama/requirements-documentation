# Requirements Documentation

An application for managing software requirements — built around user personas, functional
requirements, acceptance criteria, categories and per-item discussion. Seeded with insurtech
content, but the data model itself is domain-neutral.

## Quick start

```bash
npm install
npx prisma migrate deploy   # create ./prisma/dev.db from the committed migrations
npx prisma db seed          # insurtech personas, categories and example requirements
npm run dev                 # http://localhost:3000
```

Other scripts: `npm test` (Vitest), `npm run build`, `npm run db:studio` (Prisma Studio).

## The entities

| Entity | Notes |
|---|---|
| **Persona** | Who the system is for. Assigned to requirements, optionally overridden on a criterion. |
| **Category** | One per requirement. Its key seeds the requirement reference (`FR-BIL-001`). |
| **Functional requirement** | Title, description, rationale, assumptions, status, priority, stable reference, change history, links to other requirements. |
| **Acceptance criterion** | Ordered children of a requirement, each with its own reference (`FR-BIL-001.AC-01`). |
| **Comment** | Free-form note on a requirement or a criterion. |
| **Question** | Tracked question with `Open` / `Answered` / `Deferred`, an answer, and an optional assignee. Surfaced across the whole project at `/questions`. |

## Persona inheritance

Personas attach directly to a functional requirement. **An acceptance criterion inherits its
requirement's personas unless it declares its own**, in which case the declared set replaces the
inherited one for that criterion.

There is no separate override flag: a non-empty `AcceptanceCriterion.personas` relation *is* the
override, and clearing it reverts to inheritance. The rule lives in one place —
`resolveCriterionPersonas` in `src/lib/personas.ts` — and every view, filter and report goes
through it. The UI always shows which mode a criterion is in: inherited personas render muted with
an `inherited` tag, overrides render solid with an `override` tag and a one-click *revert to
inherited*.

Adding a persona to a requirement flows down to every inheriting criterion immediately; criteria
that override are unaffected.

## Stable references

`FR-<CATEGORY KEY>-<NNN>` is assigned once at creation from a monotonic per-prefix counter
(`RefCounter`) and is never rewritten. Moving a requirement to another category keeps its original
reference — the move is recorded in the change history instead. Deleting a requirement does not
recycle its number.

## Change history

Mutating actions pass before/after snapshots through `diffEntity` (`src/lib/changelog.ts`), so
history is derived rather than hand-written. Requirement pages show their own history plus their
criteria's; the dashboard shows the most recent entries across everything.

## Stack

Next.js 15 (App Router, server actions) · Prisma over SQLite · Tailwind CSS v4 · Zod · Vitest.

`DATABASE_URL` in `.env` points at `./prisma/dev.db`. Moving to Postgres is a `datasource`
provider change plus a fresh migration; no application code assumes SQLite.

## Layout

```
prisma/schema.prisma      data model and the inheritance rule, documented in comments
prisma/seed.ts            insurtech personas, categories and example requirements
src/lib/personas.ts       persona resolution — the single source of truth for inheritance
src/lib/refs.ts           stable reference generation
src/lib/changelog.ts      before/after diffing into change-history rows
src/lib/validation.ts     Zod schemas shared by forms and server actions
src/lib/queries.ts        reusable Prisma includes and read helpers
src/lib/actions/          server actions, one module per entity
src/app/                  dashboard, requirements, personas, categories, questions
src/components/           shared UI
```

## Notes

- Single user, no authentication. The name attached to comments and questions is held in
  `localStorage` and set in the header; swapping `useAuthorName` (`src/lib/author.ts`) for a
  session lookup is the whole change needed to move to real accounts.
- Comments and questions attach to exactly one parent (a requirement *or* a criterion). SQLite
  cannot add a `CHECK` constraint after the fact, so that invariant is enforced by the shared Zod
  refinement in `src/lib/validation.ts` rather than by the database.
- Deleting a requirement cascades to its criteria, comments, questions and links. Deleting a
  persona only removes the assignment. A category holding requirements refuses to delete.
