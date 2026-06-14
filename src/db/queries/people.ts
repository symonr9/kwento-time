import { asc, desc, eq, like } from 'drizzle-orm';

import { db } from '../client';
import { people, type NewPerson, type Person } from '../schema';

/**
 * Query builder for the people list — most-recently-contacted first, with
 * never-contacted people last (SQLite sorts NULLs last under DESC), then by
 * name. Returned as a builder so screens can feed it to `useLiveQuery`.
 */
export function peopleListQuery() {
  return db.select().from(people).orderBy(desc(people.lastContactedAt), asc(people.name));
}

export function listPeople(): Promise<Person[]> {
  return peopleListQuery();
}

export async function searchPeople(term: string): Promise<Person[]> {
  const q = `%${term.trim()}%`;
  return db.select().from(people).where(like(people.name, q)).orderBy(asc(people.name));
}

export async function getPerson(id: number): Promise<Person | null> {
  const rows = await db.select().from(people).where(eq(people.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createPerson(input: NewPerson): Promise<Person> {
  const [row] = await db.insert(people).values(input).returning();
  return row;
}

/** Partial update; `updatedAt` is refreshed automatically by the schema. */
export async function updatePerson(
  id: number,
  patch: Partial<Omit<NewPerson, 'id' | 'createdAt'>>,
): Promise<Person | null> {
  const [row] = await db.update(people).set(patch).where(eq(people.id, id)).returning();
  return row ?? null;
}

/** Deletes the person; tags/places/conversations cascade via foreign keys. */
export async function deletePerson(id: number): Promise<void> {
  await db.delete(people).where(eq(people.id, id));
}

export async function countPeople(): Promise<number> {
  const rows = await db.select({ id: people.id }).from(people);
  return rows.length;
}
