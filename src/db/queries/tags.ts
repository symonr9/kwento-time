import { and, asc, eq } from 'drizzle-orm';

import { db } from '../client';
import { people, personTags, tags, type NewTag } from '../schema';

/** Create a new label (e.g. "Family", "Work", "College"). */
export async function createTag(data: NewTag) {
  const [row] = await db.insert(tags).values(data).returning();
  return row;
}

/** All tags, alphabetical — for a tag-management screen or multi-select. */
export async function getAllTags() {
  return db.select().from(tags).orderBy(asc(tags.name));
}

export async function getTagById(id: number) {
  const [row] = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
  return row;
}

export async function updateTag(id: number, data: Partial<NewTag>) {
  const [row] = await db.update(tags).set(data).where(eq(tags.id, id)).returning();
  return row;
}

/** Deletes the tag; `person_tags` rows are cascade-deleted by the FK. */
export async function deleteTag(id: number) {
  await db.delete(tags).where(eq(tags.id, id));
}

/** All tags currently applied to a person. */
export async function getTagsForPerson(personId: number) {
  return db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(personTags)
    .innerJoin(tags, eq(personTags.tagId, tags.id))
    .where(eq(personTags.personId, personId))
    .orderBy(asc(tags.name));
}

/** Everyone tagged with a given label — e.g. "show me everyone in Family". */
export async function getPeopleByTag(tagId: number) {
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
  await db.insert(personTags).values({ personId, tagId }).onConflictDoNothing();
}

export async function removeTagFromPerson(personId: number, tagId: number) {
  await db
    .delete(personTags)
    .where(and(eq(personTags.personId, personId), eq(personTags.tagId, tagId)));
}

/** Replace all of a person's tags in one go — e.g. from a multi-select editor. */
export async function setTagsForPerson(personId: number, tagIds: number[]) {
  await db.delete(personTags).where(eq(personTags.personId, personId));
  if (tagIds.length === 0) return;
  await db.insert(personTags).values(tagIds.map((tagId) => ({ personId, tagId })));
}