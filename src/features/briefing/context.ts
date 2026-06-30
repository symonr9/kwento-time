import type {
  BriefingContext,
  BriefingLength,
  BriefingRetrievedData,
  ScoredBriefingItem,
  ScoredBriefingPerson,
} from '@/features/briefing/types';

export const briefingLengthBudgets: Record<
  BriefingLength,
  { approxWords: number; itemCount: number; peopleCount: number; seconds: number }
> = {
  short: { approxWords: 75, itemCount: 4, peopleCount: 3, seconds: 30 },
  medium: { approxWords: 150, itemCount: 7, peopleCount: 5, seconds: 60 },
  long: { approxWords: 300, itemCount: 12, peopleCount: 8, seconds: 120 },
};

function selectRoundRobin(people: ScoredBriefingPerson[], itemCount: number) {
  const selected = new Map<number, ScoredBriefingItem[]>();
  let total = 0;
  let cursor = 0;

  while (total < itemCount && people.some((person) => person.items[cursor])) {
    for (const person of people) {
      const item = person.items[cursor];
      if (!item) {
        continue;
      }

      selected.set(person.id, [...(selected.get(person.id) ?? []), item]);
      total += 1;

      if (total >= itemCount) {
        break;
      }
    }

    cursor += 1;
  }

  return selected;
}

export function buildBriefingContext(
  data: BriefingRetrievedData,
  scoredPeople: ScoredBriefingPerson[],
  length: BriefingLength,
): BriefingContext {
  const budget = briefingLengthBudgets[length];
  const people = scoredPeople.slice(0, budget.peopleCount);
  const selectedItems = selectRoundRobin(people, budget.itemCount);

  return {
    generatedAt: data.generatedAt.toISOString(),
    length: {
      approxWords: budget.approxWords,
      seconds: budget.seconds,
      value: length,
    },
    lifeItems: data.lifeItems.slice(0, Math.max(2, Math.floor(budget.itemCount / 2))).map((item, index) => ({
      createdAt: item.createdAt.toISOString(),
      salience: Math.max(0.2, 1 - index * 0.12),
      text: item.content,
      tone: item.tone,
      type: 'life',
    })),
    people: people.map((person) => ({
      items: (selectedItems.get(person.id) ?? []).map((item) => ({
        salience: item.salience,
        text: item.text,
        type: item.type,
      })),
      lastContacted: person.lastContactedAt?.toISOString() ?? null,
      name: person.name,
      presenceReason: person.presenceReason,
      relationshipHealth: person.connectionScore,
    })),
    place: {
      name: data.place.name,
    },
  };
}
