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

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type PersonTag = typeof personTags.$inferSelect;
