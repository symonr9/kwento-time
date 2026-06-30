import type { BriefingContext } from '@/features/briefing/types';

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
    if (context.lifeItems.length === 0) {
      return context.place.name === 'General'
        ? 'No current life updates are saved yet. Add a life update to generate a general overview.'
        : `No one is linked to ${context.place.name} yet. Add people to this place to generate a useful briefing.`;
    }

    const lifeSummary = context.lifeItems.map((item) => item.text).join(' Also, ');
    return context.place.name === 'General'
      ? `Here is the general overview. ${lifeSummary}. That is the current briefing.`
      : `No one is linked to ${context.place.name} yet. For your own current updates: ${lifeSummary}. That is the current briefing.`;
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

  if (context.lifeItems.length > 0) {
    const lifeSummary = context.lifeItems.map((item) => item.text).join(' Also, ');
    lines.push(`For your own current updates: ${lifeSummary}.`);
  }

  lines.push('That is the current briefing.');

  return lines.join(' ');
}
