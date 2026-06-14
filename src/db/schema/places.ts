import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { people } from './people';
import { timestamps } from './timestamps';

/** A location the user frequents — drives "Place Mode" (who will be here). */
export const places = sqliteTable(
  'places',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    address: text('address'),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [index('places_name_idx').on(t.name)],
);

/** Many-to-many between people and places; `isPrimary` marks a person's home base. */
export const personPlaces = sqliteTable(
  'person_places',
  {
    personId: integer('person_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    placeId: integer('place_id')
      .notNull()
      .references(() => places.id, { onDelete: 'cascade' }),
    isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.personId, t.placeId] }),
    index('person_places_place_idx').on(t.placeId),
  ],
);

export type Place = typeof places.$inferSelect;
export type NewPlace = typeof places.$inferInsert;
export type PersonPlace = typeof personPlaces.$inferSelect;
