import { and, asc, eq, sql } from 'drizzle-orm';

import { getDb } from '../client';
import { itemTags, people, personTags, tags, type ItemTagType, type NewTag } from '../schema';

export type TagWithUsageCounts = {
  id: number;
  name: string;
  color: string | null;
  peopleCount: number;
  placesCount: number;
  conversationsCount: number;
  lifeUpdatesCount: number;
};

/** Create a new label (e.g. "Family", "Work", "College"). */
export async function createTag(data: NewTag) {
  const db = await getDb();
  const [row] = await db.insert(tags).values(data).returning();
  return row;
}

/** All tags, alphabetical — for a tag-management screen or multi-select. */
export async function getAllTags() {
  const db = await getDb();
  return db.select().from(tags).orderBy(asc(tags.name));
}

export async function getTagsWithUsageCounts(): Promise<TagWithUsageCounts[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      itemType: itemTags.itemType,
      count: sql<number>`count(${itemTags.itemId})`,
    })
    .from(tags)
    .leftJoin(itemTags, eq(itemTags.tagId, tags.id))
    .groupBy(tags.id, itemTags.itemType)
    .orderBy(asc(tags.name));

  const byTag = new Map<number, TagWithUsageCounts>();

  for (const row of rows) {
    const current =
      byTag.get(row.id) ??
      {
        id: row.id,
        name: row.name,
        color: row.color,
        peopleCount: 0,
        placesCount: 0,
        conversationsCount: 0,
        lifeUpdatesCount: 0,
      };

    if (row.itemType === 'person') current.peopleCount = row.count;
    if (row.itemType === 'place') current.placesCount = row.count;
    if (row.itemType === 'conversation') current.conversationsCount = row.count;
    if (row.itemType === 'my_life_item') current.lifeUpdatesCount = row.count;
    byTag.set(row.id, current);
  }

  return [...byTag.values()];
}

export async function getTagById(id: number) {
  const db = await getDb();
  const [row] = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
  return row;
}

export async function updateTag(id: number, data: Partial<NewTag>) {
  const db = await getDb();
  const [row] = await db.update(tags).set(data).where(eq(tags.id, id)).returning();
  return row;
}

/** Deletes the tag; `person_tags` rows are cascade-deleted by the FK. */
export async function deleteTag(id: number) {
  const db = await getDb();
  await db.delete(tags).where(eq(tags.id, id));
}

export async function getTagsForItem(itemType: ItemTagType, itemId: number) {
  const db = await getDb();
  return db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(itemTags)
    .innerJoin(tags, eq(itemTags.tagId, tags.id))
    .where(and(eq(itemTags.itemType, itemType), eq(itemTags.itemId, itemId)))
    .orderBy(asc(tags.name));
}

export async function getItemTagLinks(itemType: ItemTagType) {
  const db = await getDb();
  return db
    .select({ itemId: itemTags.itemId, tagId: itemTags.tagId })
    .from(itemTags)
    .where(eq(itemTags.itemType, itemType));
}

export async function setTagsForItem(itemType: ItemTagType, itemId: number, tagIds: number[]) {
  const db = await getDb();
  await db
    .delete(itemTags)
    .where(and(eq(itemTags.itemType, itemType), eq(itemTags.itemId, itemId)));

  if (tagIds.length === 0) return;

  await db
    .insert(itemTags)
    .values(tagIds.map((tagId) => ({ itemType, itemId, tagId })))
    .onConflictDoNothing();
}

/** All tags currently applied to a person. */
export async function getTagsForPerson(personId: number) {
  const db = await getDb();
  return db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(personTags)
    .innerJoin(tags, eq(personTags.tagId, tags.id))
    .where(eq(personTags.personId, personId))
    .orderBy(asc(tags.name));
}

/** Everyone tagged with a given label — e.g. "show me everyone in Family". */
export async function getPeopleByTag(tagId: number) {
  const db = await getDb();
  return db
    .select({
      id: people.id,
      name: people.name,
      nickname: people.nickname,
      avatarUri: people.avatarUri,
    })
    .from(personTags)
    .innerJoin(people, eq(personTags.personId, people.id))
    .where(eq(personTags.tagId, tagId))
    .orderBy(asc(people.name));
}

/** Attach a tag to a person. Safe to call if it's already attached. */
export async function addTagToPerson(personId: number, tagId: number) {
  const db = await getDb();
  await db.insert(personTags).values({ personId, tagId }).onConflictDoNothing();
}

export async function removeTagFromPerson(personId: number, tagId: number) {
  const db = await getDb();
  await db
    .delete(personTags)
    .where(and(eq(personTags.personId, personId), eq(personTags.tagId, tagId)));
}

/** Replace all of a person's tags in one go — e.g. from a multi-select editor. */
export async function setTagsForPerson(personId: number, tagIds: number[]) {
  const db = await getDb();
  await db.delete(personTags).where(eq(personTags.personId, personId));
  if (tagIds.length === 0) return;
  await db.insert(personTags).values(tagIds.map((tagId) => ({ personId, tagId })));
}
