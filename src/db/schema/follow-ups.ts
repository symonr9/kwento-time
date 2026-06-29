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
    category: text('category'),
    importance: integer('importance').notNull().default(1),
    tone: text('tone', { enum: ['light', 'medium', 'personal'] })
      .notNull()
      .default('light'),
    resolved: integer('resolved', { mode: 'boolean' }).notNull().default(false),
    resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (t) => [
    index('follow_ups_person_idx').on(t.personId),
    index('follow_ups_resolved_idx').on(t.resolved),
  ],
);

export const followUpExpiry = sqliteTable(
  'follow_up_expiry',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    followUpId: integer('follow_up_id')
      .notNull()
      .unique()
      .references(() => followUps.id, { onDelete: 'cascade' }),
    state: text('state', { enum: ['active', 'expiring', 'extended', 'archived'] })
      .notNull()
      .default('active'),
    activatedAt: integer('activated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    extendedAt: integer('extended_at', { mode: 'timestamp_ms' }),
    archivedAt: integer('archived_at', { mode: 'timestamp_ms' }),
  },
  (t) => [
    index('follow_up_expiry_state_idx').on(t.state),
    index('follow_up_expiry_expires_idx').on(t.expiresAt),
  ],
);

export type FollowUp = typeof followUps.$inferSelect;
export type NewFollowUp = typeof followUps.$inferInsert;
export type FollowUpExpiry = typeof followUpExpiry.$inferSelect;
export type FollowUpExpiryState = FollowUpExpiry['state'];
