# src/db - Data layer (Drizzle + expo-sqlite)

The **single source of truth** for the app. All persistence flows through here. SQLite is local-first and offline; there is no remote DB.

## Layout

```
db/
  client.ts          # opens expo-sqlite (WAL + foreign_keys ON) and Drizzle singleton
  migrate.tsx        # <MigrationGate> runs Drizzle migrations before app render
  schema/            # Drizzle table definitions - one file per entity, re-exported
  queries/           # typed query/repository functions - the ONLY public DB API
  migrations/        # drizzle-kit output: *.sql + meta/ + migrations.js
```

`drizzle.config.ts` lives at the project root.

## Changing The Schema

1. Edit/add a table in `schema/` and export it from `schema/index.ts`.
2. Run `npx drizzle-kit generate`.
3. Commit the schema change and generated migration together.
4. Update query functions, backup export/import validation, and tests for any affected data.

Build glue: `babel.config.js` inlines `.sql` via `babel-plugin-inline-import`; `metro.config.js` adds `sql` to `sourceExts`. Booleans use `{ mode: 'boolean' }`; timestamps use `{ mode: 'timestamp_ms' }`.

## Rules

- **Schema-first, type-safe.** Define tables in `schema/`; derive types with `$inferSelect` / `$inferInsert`.
- **Queries live in `queries/`, not components/screens/hooks.** Hooks and features call query functions.
- **Use Drizzle query syntax** for normal access. Drop to raw SQL only for complex aggregations, and comment why.
- **Performance is non-negotiable.** Add indexes for common filters/sorts and foreign keys. Paginate/virtualize list reads. Watch N+1 patterns when loading people/places/tags.
- **Migrations:** generate with drizzle-kit; don't hand-edit generated SQL.
- **Privacy:** backup/export is owned by `@/services/backup`; don't add sync/upload paths here.

## Core Entities

`Person` . `Place` . `PersonPlace` (`isPrimary`) . `Conversation` (summary, transcript/audio metadata, createdAt) . `Topic` (talkingPoint, tone, isActive) . `TopicExpiry` . `FollowUp` (question, tone, resolved) . `FollowUpExpiry` . `Reminder` . `MyLifeItem` . `MyLifeItemExpiry` . `Icebreaker` . `Tag` . `ItemTag` (polymorphic m:n).

Store **both** the raw transcript and the GPT-4o summary on `Conversation`; raw is the source of truth for future re-extraction.

Read https://docs.expo.dev/versions/v56.0.0/sdk/sqlite/ and Drizzle expo-sqlite docs before wiring the client/migrator.
