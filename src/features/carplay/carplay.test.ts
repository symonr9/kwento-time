/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createCarPlayForecastMenu,
  createCarPlayForecastSummary,
  createCarPlayHomeMenu,
  createCarPlayPeoplePlacesMenu,
  createCarPlayPlaybackState,
} from './view-model';
import type { BriefingContext } from '@/features/forecast';
import type { CarPlayForecastData } from './types';

const now = new Date('2026-06-28T12:00:00.000Z');

const context: BriefingContext = {
  generatedAt: now.toISOString(),
  length: {
    approxWords: 150,
    seconds: 60,
    value: 'medium',
  },
  lifeItems: [
    {
      createdAt: now.toISOString(),
      salience: 3,
      text: 'You have been preparing for the reunion.',
      tone: 'medium',
      type: 'life',
    },
  ],
  people: [
    {
      items: [
        {
          salience: 5,
          text: 'Ask how the fundraiser went.',
          type: 'followup',
        },
      ],
      lastContacted: now.toISOString(),
      name: 'Mara',
      presenceReason: 'primary place',
      relationshipHealth: 82,
    },
  ],
  place: {
    name: 'Community Hall',
  },
};

const data: CarPlayForecastData = {
  generatedAt: now,
  lifeItems: [],
  people: [
    {
      avatarUri: 'file:///mara.jpg',
      connectionScore: 82,
      conversations: [
        {
          id: 1,
          occurredAt: now,
          summary: 'Talked about the fundraiser.',
        },
      ],
      followUps: [],
      id: 1,
      isPrimary: true,
      lastContactedAt: now,
      name: 'Mara',
      topics: [],
    },
  ],
  place: {
    avatarUri: 'file:///community-hall.jpg',
    id: 1,
    name: 'Community Hall',
  },
};

describe('CarPlay view models', () => {
  it('builds the two-item CarPlay home menu', () => {
    const menu = createCarPlayHomeMenu();

    assert.equal(menu.title, 'Kwento Time');
    assert.deepEqual(
      menu.items.map((item) => item.title),
      ['Forecast', 'People and Places'],
    );
  });

  it('puts General first before place forecast choices', () => {
    const menu = createCarPlayForecastMenu([
      { avatarUri: 'file:///gym.jpg', id: 2, name: 'Gym', subtitle: 'Main Street' },
    ]);

    assert.equal(menu.items[0]?.kind, 'general-forecast');
    assert.equal(menu.items[1]?.id, 'place-2');
    assert.equal(menu.items[1]?.imageUri, 'file:///gym.jpg');
  });

  it('clamps playback progress to the narration duration', () => {
    assert.deepEqual(createCarPlayPlaybackState(60, 90), {
      durationSeconds: 60,
      elapsedSeconds: 60,
      progress: 1,
    });
  });

  it('builds a forecast summary with minimal readable text and avatar metadata', () => {
    const summary = createCarPlayForecastSummary({
      context,
      data,
      elapsedSeconds: 15,
      script: 'Before you arrive at Community Hall...',
    });

    assert.equal(summary.title, 'Community Hall');
    assert.equal(summary.playback.progress, 0.25);
    assert.equal(summary.people[0]?.imageUri, 'file:///mara.jpg');
    assert.equal(summary.people[0]?.summary, 'Ask how the fundraiser went.');
    assert.equal(summary.conversations[0]?.summary, 'Talked about the fundraiser.');
  });

  it('summarizes place-linked people for the quick reference menu', () => {
    const menu = createCarPlayPeoplePlacesMenu([
      {
        avatarUri: 'file:///community-hall.jpg',
        id: 1,
        name: 'Community Hall',
        people: [{ avatarUri: 'file:///mara.jpg', name: 'Mara' }],
      },
    ]);

    assert.equal(menu.items[0]?.title, 'Community Hall');
    assert.equal(menu.items[0]?.subtitle, 'Mara');
  });
});
