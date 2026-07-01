import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { previewBackupJson } from './backup-validation';

const emptyTables = {
  appSettings: [],
  conversations: [],
  followUpExpiry: [],
  followUps: [],
  myLifeItemExpiry: [],
  myLifeItems: [],
  people: [],
  personPlaces: [],
  personTags: [],
  places: [],
  reminders: [],
  tags: [],
  topicExpiry: [],
  topics: [],
};

describe('backup JSON validation', () => {
  it('previews row counts and fills compatible optional tables', () => {
    const preview = previewBackupJson(
      JSON.stringify({
        exportedAt: '2026-06-30T12:00:00.000Z',
        tables: {
          ...emptyTables,
          people: [{ id: 1, name: 'Mara' }],
          tags: [{ id: 1, name: 'Family' }],
        },
        version: 1,
      }),
    );

    assert.equal(preview.totalRows, 2);
    assert.equal(preview.tableCounts.people, 1);
    assert.equal(preview.tableCounts.tags, 1);
    assert.equal(preview.tableCounts.icebreakers, 0);
    assert.equal(preview.tableCounts.itemTags, 0);
  });

  it('returns descriptive invalid-json errors', () => {
    assert.throws(
      () => previewBackupJson('{'),
      /Backup JSON is invalid/,
    );
  });

  it('rejects backups missing required tables', () => {
    assert.throws(
      () =>
        previewBackupJson(
          JSON.stringify({
            exportedAt: '2026-06-30T12:00:00.000Z',
            tables: {},
            version: 1,
          }),
        ),
      /appSettings/,
    );
  });
});
