import { and, desc, eq, inArray } from 'drizzle-orm';

import { getDb } from '../client';
import {
  conversations,
  followUps,
  myLifeItems,
  people,
  personPlaces,
  places,
  topicExpiry,
  topics,
} from '../schema';
import { safeAvatarUri } from './avatar-sql';

const MAX_RECENT_CONVERSATIONS_PER_PERSON = 2;
const MAX_RECENT_FOLLOW_UPS_PER_PERSON = 2;
const MAX_GENERAL_LIFE_ITEMS = 5;
const MAX_TOPICS_PER_PERSON = 3;

export type ForecastRetrievedConversation = {
  id: number;
  occurredAt: Date;
  summary: string | null;
};

export type ForecastRetrievedFollowUp = {
  id: number;
  createdAt: Date;
  question: string;
};

export type ForecastRetrievedTopic = {
  id: number;
  content: string;
  expiresAt: Date | null;
  lastMentionedAt: Date;
  state: 'active' | 'expiring' | 'extended' | 'archived' | null;
};

export type ForecastRetrievedPerson = {
  avatarUri: string | null;
  id: number;
  connectionScore: number;
  conversations: ForecastRetrievedConversation[];
  followUps: ForecastRetrievedFollowUp[];
  isPrimary: boolean;
  lastContactedAt: Date | null;
  name: string;
  topics: ForecastRetrievedTopic[];
};

export type ForecastRetrievedLifeItem = {
  id: number;
  content: string;
  createdAt: Date;
  tone: string;
};

export type ForecastRetrievedData = {
  generatedAt: Date;
  lifeItems: ForecastRetrievedLifeItem[];
  people: ForecastRetrievedPerson[];
  place: {
    avatarUri: string | null;
    id: number | null;
    name: string;
  };
};

function groupByPersonId<Row extends { personId: number | null }>(rows: Row[]) {
  const grouped = new Map<number, Row[]>();

  for (const row of rows) {
    if (!row.personId) {
      continue;
    }

    grouped.set(row.personId, [...(grouped.get(row.personId) ?? []), row]);
  }

  return grouped;
}

function takeByPerson<Row extends { personId: number | null }>(rows: Row[], limit: number) {
  const counts = new Map<number, number>();

  return rows.filter((row) => {
    if (!row.personId) {
      return false;
    }

    const count = counts.get(row.personId) ?? 0;
    if (count >= limit) {
      return false;
    }

    counts.set(row.personId, count + 1);
    return true;
  });
}

async function getForecastLifeItems() {
  const db = await getDb();

  return db
    .select({
      id: myLifeItems.id,
      content: myLifeItems.content,
      createdAt: myLifeItems.createdAt,
      tone: myLifeItems.tone,
    })
    .from(myLifeItems)
    .where(eq(myLifeItems.resolved, false))
    .orderBy(desc(myLifeItems.createdAt))
    .limit(MAX_GENERAL_LIFE_ITEMS);
}

export async function getGeneralForecastRetrieval(generatedAt = new Date()): Promise<ForecastRetrievedData> {
  return {
    generatedAt,
    lifeItems: await getForecastLifeItems(),
    people: [],
    place: { avatarUri: null, id: null, name: 'General' },
  };
}

export async function getForecastRetrieval(placeId: number, generatedAt = new Date()): Promise<ForecastRetrievedData> {
  const db = await getDb();
  const [place] = await db
    .select({ avatarUri: safeAvatarUri(places.avatarUri), id: places.id, name: places.name })
    .from(places)
    .where(eq(places.id, placeId))
    .limit(1);

  if (!place) {
    throw new Error('Place not found.');
  }

  const linkedPeople = await db
    .select({
      id: people.id,
      connectionScore: people.connectionScore,
      avatarUri: safeAvatarUri(people.avatarUri),
      isPrimary: personPlaces.isPrimary,
      lastContactedAt: people.lastContactedAt,
      name: people.name,
    })
    .from(personPlaces)
    .innerJoin(people, eq(personPlaces.personId, people.id))
    .where(eq(personPlaces.placeId, placeId))
    .orderBy(desc(personPlaces.isPrimary), desc(people.lastContactedAt));

  const personIds = linkedPeople.map((person) => person.id);

  if (personIds.length === 0) {
    return {
      generatedAt,
      lifeItems: await getForecastLifeItems(),
      people: [],
      place: { avatarUri: place.avatarUri, id: place.id, name: place.name },
    };
  }

  const [conversationRows, followUpRows, topicRows] = await Promise.all([
    db
      .select({
        id: conversations.id,
        occurredAt: conversations.occurredAt,
        personId: conversations.personId,
        summary: conversations.summary,
      })
      .from(conversations)
      .where(inArray(conversations.personId, personIds))
      .orderBy(desc(conversations.occurredAt)),
    db
      .select({
        id: followUps.id,
        createdAt: followUps.createdAt,
        personId: followUps.personId,
        question: followUps.question,
      })
      .from(followUps)
      .where(and(inArray(followUps.personId, personIds), eq(followUps.resolved, false)))
      .orderBy(desc(followUps.createdAt)),
    db
      .select({
        id: topics.id,
        content: topics.content,
        expiresAt: topicExpiry.expiresAt,
        lastMentionedAt: topics.lastMentionedAt,
        personId: topics.personId,
        state: topicExpiry.state,
      })
      .from(topics)
      .leftJoin(topicExpiry, eq(topicExpiry.topicId, topics.id))
      .where(and(inArray(topics.personId, personIds), eq(topics.resolved, false), eq(topics.isForUser, false)))
      .orderBy(desc(topics.lastMentionedAt)),
  ]);

  const conversationsByPerson = groupByPersonId(
    takeByPerson(conversationRows, MAX_RECENT_CONVERSATIONS_PER_PERSON),
  );
  const followUpsByPerson = groupByPersonId(takeByPerson(followUpRows, MAX_RECENT_FOLLOW_UPS_PER_PERSON));
  const topicsByPerson = groupByPersonId(takeByPerson(topicRows, MAX_TOPICS_PER_PERSON));

  const retrievedPeople: ForecastRetrievedPerson[] = linkedPeople.map((person) => ({
    avatarUri: person.avatarUri,
    id: person.id,
    connectionScore: person.connectionScore,
    conversations: (conversationsByPerson.get(person.id) ?? []).map<ForecastRetrievedConversation>(
      (conversation) => ({
        id: conversation.id,
        occurredAt: conversation.occurredAt,
        summary: conversation.summary,
      }),
    ),
    followUps: (followUpsByPerson.get(person.id) ?? []).map<ForecastRetrievedFollowUp>((followUp) => ({
      id: followUp.id,
      createdAt: followUp.createdAt,
      question: followUp.question,
    })),
    isPrimary: person.isPrimary,
    lastContactedAt: person.lastContactedAt,
    name: person.name,
    topics: (topicsByPerson.get(person.id) ?? []).map<ForecastRetrievedTopic>((topic) => ({
      id: topic.id,
      content: topic.content,
      expiresAt: topic.expiresAt,
      lastMentionedAt: topic.lastMentionedAt,
      state: topic.state,
    })),
  }));

  return {
    generatedAt,
    lifeItems: await getForecastLifeItems(),
    people: retrievedPeople,
    place: { avatarUri: place.avatarUri, id: place.id, name: place.name },
  };
}
