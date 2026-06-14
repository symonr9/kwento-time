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
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    ...timestamps,
  },
  (t) => [index('my_life_items_active_idx').on(t.isActive)],
);

export type MyLifeItem = typeof myLifeItems.$inferSelect;
export type NewMyLifeItem = typeof myLifeItems.$inferInsert;
export type MyLifeTone = MyLifeItem['tone'];
