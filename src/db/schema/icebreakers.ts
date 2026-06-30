import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from './timestamps';

export const icebreakers = sqliteTable(
  'icebreakers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    text: text('text').notNull(),
    tone: text('tone', { enum: ['light', 'medium', 'personal'] })
      .notNull()
      .default('light'),
    ...timestamps,
  },
  (t) => [
    index('icebreakers_tone_idx').on(t.tone),
    index('icebreakers_created_at_idx').on(t.createdAt),
  ],
);

export type Icebreaker = typeof icebreakers.$inferSelect;
export type NewIcebreaker = typeof icebreakers.$inferInsert;
export type IcebreakerTone = Icebreaker['tone'];
