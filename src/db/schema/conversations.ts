import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { people } from './people';
import { places } from './places';
import { timestamps } from './timestamps';

/**
 * A logged conversation. `rawTranscript` is the source of truth (kept so notes
 * can be re-structured as local drafting improves); `summary` holds the local
 * summary. `source` distinguishes manual text from voice.
 */
export const conversations = sqliteTable(
  'conversations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    personId: integer('person_id').references(() => people.id, { onDelete: 'cascade' }),
    placeId: integer('place_id').references(() => places.id, { onDelete: 'set null' }),
    rawTranscript: text('raw_transcript'),
    summary: text('summary'),
    audioUri: text('audio_uri'),
    source: text('source', { enum: ['manual', 'voice', 'import'] }).notNull().default('manual'),
    transcriptStatus: text('transcript_status', {
      enum: ['not_required', 'pending_transcription', 'ready_for_review', 'confirmed', 'failed'],
    })
      .notNull()
      .default('confirmed'),
    structureStatus: text('structure_status', {
      enum: ['not_needed', 'pending', 'in_progress', 'completed', 'failed'],
    })
      .notNull()
      .default('not_needed'),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    ...timestamps,
  },
  (t) => [
    index('conversations_person_idx').on(t.personId),
    index('conversations_place_idx').on(t.placeId),
    index('conversations_occurred_idx').on(t.occurredAt),
    index('conversations_transcript_status_idx').on(t.transcriptStatus),
    index('conversations_structure_status_idx').on(t.structureStatus),
  ],
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
