import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { people } from './people';
import { timestamps } from './timestamps';

/** User-defined label for grouping people (e.g. "Family", "Work", "College"). */
export const tags = sqliteTable(
  'tags',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
    color: text('color'),
    ...timestamps,
  },
  (t) => [index('tags_name_idx').on(t.name)],
);

/** Many-to-many join between people and tags. */
export const personTags = sqliteTable(
  'person_tags',
  {
    personId: integer('person_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.personId, t.tagId] }),
    index('person_tags_tag_idx').on(t.tagId),
  ],
);

/** Generic tag links for every taggable item type. */
export const itemTags = sqliteTable(
  'item_tags',
  {
    itemType: text('item_type', {
      enum: ['person', 'place', 'conversation', 'my_life_item', 'icebreaker'],
    }).notNull(),
    itemId: integer('item_id').notNull(),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.itemType, t.itemId, t.tagId] }),
    index('item_tags_tag_idx').on(t.tagId),
    index('item_tags_item_idx').on(t.itemType, t.itemId),
  ],
);

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type PersonTag = typeof personTags.$inferSelect;
export type ItemTag = typeof itemTags.$inferSelect;
export type ItemTagType = ItemTag['itemType'];
