import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from './timestamps';

/**
 * The user's own current life items for the "How Are You?" page, tagged by how
 * openly they'd share it: light (small talk) / medium / personal (close ties).
 */
export const myLifeItems = sqliteTable(
  'my_life_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    content: text('content').notNull(),
    tone: text('tone', { enum: ['light', 'medium', 'personal'] })
      .notNull()
      .default('light'),
    resolved: integer('resolved', { mode: 'boolean' }).notNull().default(false),
    resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (t) => [
    index('my_life_items_resolved_idx').on(t.resolved),
  ],
);

export const myLifeItemExpiry = sqliteTable(
  'my_life_item_expiry',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    myLifeItemId: integer('my_life_item_id')
      .notNull()
      .unique()
      .references(() => myLifeItems.id, { onDelete: 'cascade' }),
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
    index('my_life_item_expiry_state_idx').on(t.state),
    index('my_life_item_expiry_expires_idx').on(t.expiresAt),
  ],
);

export type MyLifeItem = typeof myLifeItems.$inferSelect;
export type NewMyLifeItem = typeof myLifeItems.$inferInsert;
export type MyLifeTone = MyLifeItem['tone'];

export type MyLifeExpiry = typeof myLifeItemExpiry.$inferSelect;
export type MyLifeExpiryState = MyLifeExpiry['state'];
