import { integer } from 'drizzle-orm/sqlite-core';

/**
 * Shared `createdAt` / `updatedAt` columns, spread into table definitions.
 * Stored as integer epoch-millis and surfaced to JS as `Date` (drizzle's
 * `timestamp_ms` mode). Defaults are filled by drizzle on insert/update —
 * raw-SQL writes must set them explicitly.
 */
export const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
};
