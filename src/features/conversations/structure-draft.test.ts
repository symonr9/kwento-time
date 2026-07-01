import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildStructuredConversationDraft } from './structure-draft';

describe('structured conversation draft', () => {
  it('separates follow-up questions from likely talking points', () => {
    const draft = buildStructuredConversationDraft(`
      Sam mentioned they started a new design role. Ask about the first client kickoff?
      They shared that their sister is visiting next month! Follow up on the apartment search.
    `);

    assert.deepEqual(draft.followUps, [
      'Ask about the first client kickoff?',
      'Follow up on the apartment search',
    ]);
    assert.deepEqual(draft.topics, [
      'Sam mentioned they started a new design role',
      'They shared that their sister is visiting next month',
    ]);
  });
});
