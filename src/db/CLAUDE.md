# src/db — Data layer (Drizzle + expo-sqlite)

The **single source of truth** for the app. All persistence flows through here. SQLite is local-first and offline; there is no remote DB.

## Layout

```
db/
  client.ts          # opens expo-sqlite (WAL + foreign_keys ON) and the Drizzle instance (singleton)
  migrate.tsx        # <MigrationGate> — runs Drizzle migrations before the app renders
  schema/            # Drizzle table definitions — one file per entity, re-exported from index.ts
  queries/           # typed query/repository functions — the ONLY public DB API
  migrations/        # drizzle-kit OUTPUT: *.sql + meta/ + migrations.js (do not hand-edit)
```
`drizzle.config.ts` lives at the **project root** (not here) — that's where drizzle-kit expects it.

## Changing the schema

1. Edit/add a table in `schema/` and export it from `schema/index.ts`.
2. Run `npx drizzle-kit generate` → writes a new `NNNN_*.sql` + updates `migrations/migrations.js`.
3. Commit both the schema change and the generated migration. They apply automatically on next app launch via `<MigrationGate>` (`drizzle-orm/expo-sqlite/migrator`).

Build glue (already wired): `babel.config.js` inlines `.sql` via `babel-plugin-inline-import`; `metro.config.js` adds `sql` to `sourceExts`. Booleans use `{ mode: 'boolean' }`, timestamps `{ mode: 'timestamp_ms' }` (↔ JS `Date`); see `schema/timestamps.ts`.

## Rules

- **Schema-first, type-safe.** Define tables in `schema/`; derive types with `$inferSelect` / `$inferInsert`. Never hand-write row types — infer them and re-export from `@/types` if shared.
- **Queries live in `queries/`, not in components/screens/hooks.** Hooks and features call query functions; they never build Drizzle queries inline. This keeps the DB boundary auditable and tunable.
- **Use Drizzle query syntax** for normal access. Drop to **raw SQL only for complex aggregations** — notably the health-score computation (multi-table joins over people, conversations, follow-ups, last-contact). Comment why raw SQL was chosen.
- **Performance is non-negotiable.** Devices may hold 1,000+ people and 10,000+ conversations. Add indexes for every common filter/sort (`lastContactedAt`, `isActive`, foreign keys, `scheduledAt`). Paginate list reads. Watch for N+1 patterns when loading people-with-tags/places.
- **Migrations:** generate with drizzle-kit when the schema changes; run them on app start (e.g. via `drizzle-orm/expo-sqlite/migrator`). Don't hand-edit generated SQL. No migrations are needed until the data model changes.
- **Privacy:** data is encrypted at rest by the OS. Don't add a separate sync/upload path here — backup/export is owned by `@/services/backup`.

## Core entities

`Person` · `Tag` + `PersonTag` (m:n) · `Place` + `PersonPlace` (m:n, `isPrimary`) · `Conversation` (summary, createdAt) · `Topic` (talkingPoint, tone, isActive) · `TopicExpiry` (state: active/expiring/extended/archived, timestamps) · `FollowUp` (question, tone, resolved) · `Reminder` (scheduledAt, type, sent) · `MyLifeItem` (content, tone, isActive) · `Icebreaker` (question text, tone).

Store **both** the raw transcript and the GPT-4o summary on `Conversation` — raw is the source of truth for future re-extraction.

Read https://docs.expo.dev/versions/v56.0.0/sdk/sqlite/ and the Drizzle expo-sqlite docs before wiring the client/migrator.
