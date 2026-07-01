# src/types — Shared TypeScript types

Cross-cutting types used by **more than one** layer (feature ↔ service ↔ db).

## Rules

- **Prefer Drizzle-inferred types for DB rows.** Define tables in `@/db/schema`, infer with `$inferSelect` / `$inferInsert`, and re-export here only if widely shared. Don't duplicate row shapes by hand.
- Good homes here: shared local transcript-structuring result shapes, notification payload types, backup/export JSON schema, tone enums, the topic-expiry state union.
- Keep types that belong to a single feature inside that feature folder; only lift to `@/types` when shared.
- Types only — no runtime values. `kebab-case` files (e.g. `transcript-structure.ts`, `backup.ts`).
