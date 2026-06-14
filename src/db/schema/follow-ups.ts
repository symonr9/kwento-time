import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { conversations } from './conversations';
import { people } from './people';
import { timestamps } from './timestamps';

/** An open question to revisit with a person (e.g. "Ask how the move went"). */
export const followUps = sqliteTable(
  'follow_ups',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    personId: integer('person_id').references(() => people.id, { onDelete: 'cascade' }),
    conversationId: integer('conversation_id').references(() => conversations.id, {
      onDelete: 'set null',
    }),
    question: text('question').notNull(),
    resolved: integer('resolved', { mode: 'boolean' }).notNull().default(false),
    resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (t) => [
    index('follow_ups_person_idx').on(t.personId),
    index('follow_ups_resolved_idx').on(t.resolved),
  ],
);

export type FollowUp = typeof followUps.$inferSelect;
export type NewFollowUp = typeof followUps.$inferInsert;
