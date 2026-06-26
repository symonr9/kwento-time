import type {
  ForecastRetrievedData,
  ForecastRetrievedPerson,
  ForecastRetrievedTopic,
  ScoredForecastItem,
  ScoredForecastPerson,
} from '@/features/forecast/types';

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function recencyScore(value: Date | null, now: Date, horizonDays: number) {
  if (!value) {
    return 0;
  }

  const ageDays = Math.max(0, (now.getTime() - value.getTime()) / DAY_MS);
  return clamp01(1 - ageDays / horizonDays);
}

function topicFreshnessScore(topic: ForecastRetrievedTopic, now: Date) {
  const recency = recencyScore(topic.lastMentionedAt, now, 45);
  const expiryUrgency =
    topic.expiresAt && topic.expiresAt >= now
      ? clamp01(1 - (topic.expiresAt.getTime() - now.getTime()) / (7 * DAY_MS))
      : 0;
  const stateBoost = topic.state === 'expiring' ? 1 : topic.state === 'extended' ? 0.65 : 0.45;

  return clamp01(recency * 0.45 + expiryUrgency * 0.35 + stateBoost * 0.2);
}

function scorePresence(person: ForecastRetrievedPerson, now: Date) {
  const placeAffinity = person.isPrimary ? 1 : 0.72;
  const recentContact = recencyScore(person.lastContactedAt, now, 90);
  const relationshipHealth = clamp01(person.connectionScore / 100);
  return clamp01(placeAffinity * 0.6 + recentContact * 0.25 + relationshipHealth * 0.15);
}

function scoreItems(person: ForecastRetrievedPerson, now: Date) {
  const followUpItems: ScoredForecastItem[] = person.followUps.map((followUp) => ({
    personId: person.id,
    salience: clamp01(0.76 + recencyScore(followUp.createdAt, now, 60) * 0.24),
    text: followUp.question,
    type: 'followup',
  }));

  const topicItems: ScoredForecastItem[] = person.topics.map((topic) => ({
    personId: person.id,
    salience: clamp01(topicFreshnessScore(topic, now) * 0.7 + clamp01(topic.importance / 5) * 0.3),
    text: topic.content,
    type: 'topic',
  }));

  const recentItems: ScoredForecastItem[] = person.conversations
    .filter((conversation) => conversation.summary)
    .map((conversation) => ({
      personId: person.id,
      salience: clamp01(0.35 + recencyScore(conversation.occurredAt, now, 45) * 0.5),
      text: conversation.summary ?? '',
      type: 'recent',
    }));

  return [...followUpItems, ...topicItems, ...recentItems].sort((a, b) => b.salience - a.salience);
}

export function scoreForecastData(data: ForecastRetrievedData, now: Date): ScoredForecastPerson[] {
  return data.people
    .map((person) => ({
      ...person,
      items: scoreItems(person, now),
      presenceReason: person.isPrimary ? 'primary place' : 'linked to this place',
      presenceScore: scorePresence(person, now),
    }))
    .sort((a, b) => b.presenceScore - a.presenceScore);
}
