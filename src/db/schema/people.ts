import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from './timestamps';

/**
 * A person the user wants to remember and stay connected with.
 * `healthScore` (0–100) is recomputed locally by the nightly background job;
 * `lastContactedAt` is bumped whenever a conversation is logged.
 */
export const people = sqliteTable(
  'people',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    nickname: text('nickname'),
    howWeMet: text('how_we_met'),
    /** ISO `YYYY-MM-DD`; year optional → may be `--MM-DD`. */
    birthday: text('birthday'),
    avatarUri: text('avatar_uri'),
    notes: text('notes'),
    healthScore: integer('health_score').notNull().default(0),
    lastContactedAt: integer('last_contacted_at', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (t) => [
    index('people_name_idx').on(t.name),
    index('people_last_contacted_idx').on(t.lastContactedAt),
  ],
);

export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
