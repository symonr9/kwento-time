import type { BriefingContext } from '@/features/forecast/types';

function itemSentence(name: string, item: BriefingContext['people'][number]['items'][number]) {
  if (item.type === 'followup') {
    return `Ask ${name}: ${item.text}.`;
  }

  if (item.type === 'recent') {
    return `Recently with ${name}: ${item.text}.`;
  }

  return `For ${name}, bring up ${item.text}.`;
}

export function narrateBriefing(context: BriefingContext) {
  if (context.people.length === 0) {
    return `No one is linked to ${context.place.name} yet. Add people to this place to generate a useful briefing.`;
  }

  const likelyPeople = context.people.map((person) => person.name).join(', ');
  const lines = [
    `Before you arrive at ${context.place.name}, you are likely to see ${likelyPeople}.`,
  ];

  for (const person of context.people) {
    if (person.items.length === 0) {
      lines.push(`${person.name} has no open talking points yet.`);
      continue;
    }

    for (const item of person.items) {
      lines.push(itemSentence(person.name, item));
    }
  }

  lines.push('That is the current forecast.');

  return lines.join(' ');
}
