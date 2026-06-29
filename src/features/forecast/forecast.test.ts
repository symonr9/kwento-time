/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildBriefingContext, forecastLengthBudgets } from './context';
import { narrateBriefing } from './narrator';
import { scoreForecastData } from './scoring';
import type { ForecastRetrievedData } from './types';

const now = new Date('2026-06-28T12:00:00.000Z');

function daysAgo(days: number) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days: number) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

const forecastData: ForecastRetrievedData = {
  generatedAt: now,
  lifeItems: [
    {
      id: 1,
      content: 'You have been preparing for the reunion.',
      createdAt: daysAgo(1),
      tone: 'medium',
    },
  ],
  place: {
    avatarUri: 'file:///community-hall.jpg',
    id: 1,
    name: 'Community Hall',
  },
  people: [
    {
      avatarUri: 'file:///mara.jpg',
      id: 1,
      connectionScore: 82,
      conversations: [
        {
          id: 1,
          occurredAt: daysAgo(4),
          summary: 'Talked about the fundraiser.',
        },
      ],
      followUps: [
        {
          id: 1,
          createdAt: daysAgo(2),
          question: 'How did the fundraiser go?',
        },
      ],
      isPrimary: true,
      lastContactedAt: daysAgo(5),
      name: 'Mara',
      topics: [
        {
          id: 1,
          content: 'Her new role starts next month',
          expiresAt: daysFromNow(2),
          importance: 5,
          lastMentionedAt: daysAgo(3),
          state: 'expiring',
        },
      ],
    },
    {
      avatarUri: null,
      id: 2,
      connectionScore: 90,
      conversations: [
        {
          id: 2,
          occurredAt: daysAgo(1),
          summary: 'Mentioned weekend travel.',
        },
      ],
      followUps: [],
      isPrimary: false,
      lastContactedAt: daysAgo(1),
      name: 'Noah',
      topics: [
        {
          id: 2,
          content: 'Planning a family trip',
          expiresAt: daysFromNow(20),
          importance: 2,
          lastMentionedAt: daysAgo(1),
          state: 'active',
        },
      ],
    },
  ],
};

describe('deterministic forecast', () => {
  it('prioritizes primary-place people before linked people when signals are close', () => {
    const [first, second] = scoreForecastData(forecastData, now);

    assert.equal(first.name, 'Mara');
    assert.equal(first.presenceReason, 'primary place');
    assert.equal(second.name, 'Noah');
  });

  it('builds a short context within the configured people and item budgets', () => {
    const scored = scoreForecastData(forecastData, now);
    const context = buildBriefingContext(forecastData, scored, 'short');
    const itemCount = context.people.reduce((count, person) => count + person.items.length, 0);

    assert.equal(context.length.value, 'short');
    assert.equal(context.length.seconds, forecastLengthBudgets.short.seconds);
    assert.ok(context.people.length <= forecastLengthBudgets.short.peopleCount);
    assert.ok(itemCount <= forecastLengthBudgets.short.itemCount);
  });

  it('keeps follow-ups and recent context in the narration', () => {
    const scored = scoreForecastData(forecastData, now);
    const context = buildBriefingContext(forecastData, scored, 'medium');
    const script = narrateBriefing(context);

    assert.match(script, /Before you arrive at Community Hall/);
    assert.match(script, /Ask Mara: How did the fundraiser go\?/);
    assert.match(script, /Recently with Noah: Mentioned weekend travel\./);
    assert.match(script, /That is the current forecast\./);
  });

  it('narrates an actionable empty state when no people are linked', () => {
    const script = narrateBriefing({
      generatedAt: now.toISOString(),
      length: {
        approxWords: 75,
        seconds: 30,
        value: 'short',
      },
      lifeItems: [],
      people: [],
      place: {
        name: 'Community Hall',
      },
    });

    assert.equal(
      script,
      'No one is linked to Community Hall yet. Add people to this place to generate a useful briefing.',
    );
  });

  it('narrates a general life overview without a place', () => {
    const script = narrateBriefing({
      generatedAt: now.toISOString(),
      length: {
        approxWords: 75,
        seconds: 30,
        value: 'short',
      },
      lifeItems: [
        {
          createdAt: now.toISOString(),
          salience: 1,
          text: 'You have been training for a 10K.',
          tone: 'light',
          type: 'life',
        },
      ],
      people: [],
      place: {
        name: 'General',
      },
    });

    assert.match(script, /Here is the general overview/);
    assert.match(script, /training for a 10K/);
  });
});
