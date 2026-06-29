import { getDb } from '../client';
import {
  conversations,
  followUpExpiry,
  followUps,
  myLifeItemExpiry,
  myLifeItems,
  people,
  personPlaces,
  personTags,
  places,
  reminders,
  tags,
  topicExpiry,
  topics,
} from '../schema';

const dateFieldNames = new Set([
  'activatedAt',
  'archivedAt',
  'createdAt',
  'expiresAt',
  'extendedAt',
  'lastContactedAt',
  'lastMentionedAt',
  'occurredAt',
  'resolvedAt',
  'scheduledAt',
  'updatedAt',
]);

type PeopleRow = typeof people.$inferSelect;
type TagRow = typeof tags.$inferSelect;
type PersonTagRow = typeof personTags.$inferSelect;
type PlaceRow = typeof places.$inferSelect;
type PersonPlaceRow = typeof personPlaces.$inferSelect;
type ConversationRow = typeof conversations.$inferSelect;
type TopicRow = typeof topics.$inferSelect;
type TopicExpiryRow = typeof topicExpiry.$inferSelect;
type FollowUpRow = typeof followUps.$inferSelect;
type FollowUpExpiryRow = typeof followUpExpiry.$inferSelect;
type ReminderRow = typeof reminders.$inferSelect;
type MyLifeItemRow = typeof myLifeItems.$inferSelect;
type MyLifeItemExpiryRow = typeof myLifeItemExpiry.$inferSelect;

export type KwentoBackup = {
  exportedAt: string;
  tables: {
    conversations: ConversationRow[];
    followUpExpiry: FollowUpExpiryRow[];
    followUps: FollowUpRow[];
    myLifeItemExpiry: MyLifeItemExpiryRow[];
    myLifeItems: MyLifeItemRow[];
    people: PeopleRow[];
    personPlaces: PersonPlaceRow[];
    personTags: PersonTagRow[];
    places: PlaceRow[];
    reminders: ReminderRow[];
    tags: TagRow[];
    topicExpiry: TopicExpiryRow[];
    topics: TopicRow[];
  };
  version: 1;
};

export type BackupImportResult = {
  importedRows: number;
  skippedConflicts: boolean;
};

function reviveDateFields<Row extends Record<string, unknown>>(rows: Row[]) {
  return rows.map((row) => {
    const revived: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      revived[key] = dateFieldNames.has(key) && typeof value === 'string' ? new Date(value) : value;
    }

    return revived as Row;
  });
}

function countRows(backup: KwentoBackup) {
  return Object.values(backup.tables).reduce((count, rows) => count + rows.length, 0);
}

export async function exportBackup(): Promise<KwentoBackup> {
  const db = await getDb();
  const [
    peopleRows,
    tagRows,
    personTagRows,
    placeRows,
    personPlaceRows,
    conversationRows,
    topicRows,
    topicExpiryRows,
    followUpRows,
    followUpExpiryRows,
    reminderRows,
    myLifeRows,
    myLifeExpiryRows,
  ] = await Promise.all([
    db.select().from(people),
    db.select().from(tags),
    db.select().from(personTags),
    db.select().from(places),
    db.select().from(personPlaces),
    db.select().from(conversations),
    db.select().from(topics),
    db.select().from(topicExpiry),
    db.select().from(followUps),
    db.select().from(followUpExpiry),
    db.select().from(reminders),
    db.select().from(myLifeItems),
    db.select().from(myLifeItemExpiry),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    tables: {
      conversations: conversationRows,
      followUpExpiry: followUpExpiryRows,
      followUps: followUpRows,
      myLifeItemExpiry: myLifeExpiryRows,
      myLifeItems: myLifeRows,
      people: peopleRows,
      personPlaces: personPlaceRows,
      personTags: personTagRows,
      places: placeRows,
      reminders: reminderRows,
      tags: tagRows,
      topicExpiry: topicExpiryRows,
      topics: topicRows,
    },
    version: 1,
  };
}

export async function importBackup(backup: KwentoBackup): Promise<BackupImportResult> {
  if (backup.version !== 1) {
    throw new Error('Unsupported backup version.');
  }

  const db = await getDb();
  const importedRows = countRows(backup);

  await db.transaction(async (tx) => {
    if (backup.tables.people.length > 0) {
      await tx
        .insert(people)
        .values(reviveDateFields(backup.tables.people) as (typeof people.$inferInsert)[])
        .onConflictDoNothing();
    }
    if (backup.tables.tags.length > 0) {
      await tx
        .insert(tags)
        .values(reviveDateFields(backup.tables.tags) as (typeof tags.$inferInsert)[])
        .onConflictDoNothing();
    }
    if (backup.tables.places.length > 0) {
      await tx
        .insert(places)
        .values(reviveDateFields(backup.tables.places) as (typeof places.$inferInsert)[])
        .onConflictDoNothing();
    }
    if (backup.tables.personTags.length > 0) {
      await tx.insert(personTags).values(backup.tables.personTags).onConflictDoNothing();
    }
    if (backup.tables.personPlaces.length > 0) {
      await tx.insert(personPlaces).values(backup.tables.personPlaces).onConflictDoNothing();
    }
    if (backup.tables.conversations.length > 0) {
      await tx
        .insert(conversations)
        .values(reviveDateFields(backup.tables.conversations) as (typeof conversations.$inferInsert)[])
        .onConflictDoNothing();
    }
    if (backup.tables.topics.length > 0) {
      await tx
        .insert(topics)
        .values(reviveDateFields(backup.tables.topics) as (typeof topics.$inferInsert)[])
        .onConflictDoNothing();
    }
    if (backup.tables.topicExpiry.length > 0) {
      await tx
        .insert(topicExpiry)
        .values(reviveDateFields(backup.tables.topicExpiry) as (typeof topicExpiry.$inferInsert)[])
        .onConflictDoNothing();
    }
    if (backup.tables.followUps.length > 0) {
      await tx
        .insert(followUps)
        .values(reviveDateFields(backup.tables.followUps) as (typeof followUps.$inferInsert)[])
        .onConflictDoNothing();
    }
    if (backup.tables.followUpExpiry.length > 0) {
      await tx
        .insert(followUpExpiry)
        .values(reviveDateFields(backup.tables.followUpExpiry) as (typeof followUpExpiry.$inferInsert)[])
        .onConflictDoNothing();
    }
    if (backup.tables.reminders.length > 0) {
      await tx
        .insert(reminders)
        .values(reviveDateFields(backup.tables.reminders) as (typeof reminders.$inferInsert)[])
        .onConflictDoNothing();
    }
    if (backup.tables.myLifeItems.length > 0) {
      await tx
        .insert(myLifeItems)
        .values(reviveDateFields(backup.tables.myLifeItems) as (typeof myLifeItems.$inferInsert)[])
        .onConflictDoNothing();
    }
    if (backup.tables.myLifeItemExpiry.length > 0) {
      await tx
        .insert(myLifeItemExpiry)
        .values(reviveDateFields(backup.tables.myLifeItemExpiry) as (typeof myLifeItemExpiry.$inferInsert)[])
        .onConflictDoNothing();
    }
  });

  return {
    importedRows,
    skippedConflicts: true,
  };
}
