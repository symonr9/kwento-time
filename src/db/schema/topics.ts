import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { conversations } from './conversations';
import { people } from './people';
import { timestamps } from './timestamps';

/** A talking point about a person (often extracted from a conversation). */
export const topics = sqliteTable(
  'topics',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    personId: integer('person_id').references(() => people.id, { onDelete: 'cascade' }),
    conversationId: integer('conversation_id').references(() => conversations.id, {
      onDelete: 'set null',
    }),
    content: text('content').notNull(),
    category: text('category'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index('topics_person_idx').on(t.personId),
    index('topics_active_idx').on(t.isActive),
  ],
);

/**
 * Lifecycle tracker for a topic, kept separate so the nightly job can advance
 * state without touching the topic row: active → expiring → extended → archived.
 * `expiresAt` = activation + 30 days; the last 7 days are the "expiring" window.
 */
export const topicExpiry = sqliteTable(
  'topic_expiry',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    topicId: integer('topic_id')
      .notNull()
      .unique()
      .references(() => topics.id, { onDelete: 'cascade' }),
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
    index('topic_expiry_state_idx').on(t.state),
    index('topic_expiry_expires_idx').on(t.expiresAt),
  ],
);

export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;
export type TopicExpiry = typeof topicExpiry.$inferSelect;
export type TopicExpiryState = TopicExpiry['state'];
