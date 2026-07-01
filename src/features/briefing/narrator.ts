import type { BriefingContext } from '@/features/briefing/types';

const placeOpeners = [
  'Before you arrive at {place}, here is the read.',
  'Here is the quick shape of {place} before you walk in.',
  'For {place}, keep this in your pocket.',
  'A quick briefing for {place}.',
  'As you head into {place}, these are the threads worth remembering.',
  'Here is what feels most useful for {place}.',
  'Before {place}, take a second with this.',
  'For this stop at {place}, the useful context is pretty simple.',
  'Going into {place}, start with this.',
  'Here is the social map for {place}.',
  'For {place}, a few things are worth having ready.',
  'Before you get there, here is the warm-up for {place}.',
];

const customOpeners = [
  'Here is the quick read for this briefing.',
  'For this custom briefing, start here.',
  'Here is the useful context for the people you picked.',
  'A quick pass over the people and life updates you chose.',
  'Here is what stands out for this briefing.',
  'For this group, these are the threads to keep close.',
];

const generalOpeners = [
  'Here is the general overview.',
  'Here is what is current on your side.',
  'For your own context, here is the quick read.',
  'A quick personal overview.',
  'Here is the latest life context to keep in mind.',
  'For your side of the conversation, this is what is current.',
  'Here is the personal context that may be useful today.',
  'A quick grounding pass on your own updates.',
];

const peopleLeadIns = [
  'You may run into {people}.',
  'The likely people are {people}.',
  'Keep {people} in mind.',
  'The names to have ready are {people}.',
  'Expect {people} to be the main people in the mix.',
  'The most relevant people are {people}.',
  '{people} are the people worth preparing for.',
  'Start by thinking about {people}.',
  'The strongest signals point to {people}.',
  'The people most worth remembering are {people}.',
];

const firstPersonTransitions = [
  'Start with {name}.',
  '{name} is probably the first person to keep in mind.',
  'With {name}, lead gently.',
  '{name} has the clearest thread right now.',
  'For {name}, there is a useful opening.',
  'Begin your mental notes with {name}.',
  '{name} is worth a little extra attention.',
  'The first useful thread is with {name}.',
];

const nextPersonTransitions = [
  'For {name}, shift to this.',
  'With {name}, keep it simple.',
  '{name} has a different thread.',
  'If you see {name}, there is one useful angle.',
  'For {name}, the context is lighter but still useful.',
  'On {name}, remember this.',
  '{name} is also worth checking in with.',
  'A good thread for {name} is this.',
  'Then there is {name}.',
  'For {name}, you have a ready opening.',
];

const noItemPhrases = [
  '{name} does not have an open talking point yet.',
  'There is no saved thread for {name} right now.',
  'For {name}, just stay open and listen for what they bring up.',
  '{name} has no current prompt saved, so a light check-in is enough.',
  'With {name}, there is nothing urgent in the notes.',
  'For {name}, keep the conversation easy unless something new comes up.',
  '{name} is in the briefing, but there is no specific item attached.',
  'No specific follow-up is saved for {name}.',
];

const followUpPhrases = [
  'A simple follow-up: {text}',
  'Ask this if it fits: {text}',
  'The open loop is: {text}',
  'A thoughtful check-in would be: {text}',
  'This is the question to have ready: {text}',
  'If the moment is right, ask: {text}',
  'The useful follow-up is: {text}',
  'There is one loose thread: {text}',
  'A gentle way back in is: {text}',
  'The saved follow-up is: {text}',
  'You can naturally ask: {text}',
  'One thing not to forget: {text}',
];

const recentPhrases = [
  'Recently, the thread was: {text}',
  'The latest note says: {text}',
  'Last context to remember: {text}',
  'The recent conversation was around: {text}',
  'A recent detail: {text}',
  'The freshest saved context is: {text}',
  'You last had this thread: {text}',
  'The recent signal is: {text}',
  'What is current from the notes: {text}',
  'The last useful memory is: {text}',
];

const topicPhrases = [
  'A good topic to bring up: {text}',
  'Keep this talking point ready: {text}',
  'This may be worth asking about: {text}',
  'A natural thread is: {text}',
  'If conversation slows, use this: {text}',
  'There is a saved talking point: {text}',
  'This could be an easy doorway: {text}',
  'A warm thing to remember: {text}',
  'The topic with some life in it: {text}',
  'You can lightly return to: {text}',
  'A useful thread to pick back up: {text}',
  'This is still worth remembering: {text}',
];

const lifeIntros = [
  'For your own side of the conversation, remember this.',
  'A bit of your life context may also matter.',
  'If people ask how you are, this is current.',
  'For your own updates, keep this nearby.',
  'Your side of the story has a few current notes.',
  'If the conversation turns back to you, this is relevant.',
  'For your own current context, here is what stands out.',
  'A few personal updates may be worth sharing.',
  'This is the part that is about you.',
  'For your own grounding, keep this in mind.',
];

const lifeItemPhrases = [
  '{text}',
  'You can mention that {text}',
  'One current update: {text}',
  'A useful personal note: {text}',
  'Your recent context: {text}',
  'If it comes up naturally: {text}',
  'A small but useful detail: {text}',
  'This may be worth sharing: {text}',
  'One thing happening on your side: {text}',
  'A current thread for you: {text}',
];

const closings = [
  'That is the current briefing.',
  'That should be enough to walk in prepared.',
  'That is the useful context for now.',
  'You are ready for the room.',
  'That is the quick pass.',
  'Keep it light, and let the conversation breathe.',
  'That is enough; the rest can stay natural.',
  'That is the briefing for this moment.',
  'You have the main threads now.',
  'That should give you a warm start.',
];

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function baseSeed(context: BriefingContext) {
  return [
    context.generatedAt.slice(0, 10),
    context.length.value,
    context.place.name,
    context.people.map((person) => person.name).join('|'),
    context.lifeItems.map((item) => item.text).join('|'),
  ].join('::');
}

function pick<T>(items: readonly T[], seed: string, salt: string) {
  return items[hashString(`${seed}:${salt}`) % items.length];
}

function fill(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );
}

function ensureSentence(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function formatPeople(names: string[]) {
  if (names.length <= 2) {
    return names.join(' and ');
  }

  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function narrateItem(
  name: string,
  item: BriefingContext['people'][number]['items'][number],
  seed: string,
  itemIndex: number,
) {
  const salt = `${name}:${item.type}:${itemIndex}:${item.text}`;

  if (item.type === 'followup') {
    return ensureSentence(fill(pick(followUpPhrases, seed, salt), { text: item.text }));
  }

  if (item.type === 'recent') {
    return ensureSentence(fill(pick(recentPhrases, seed, salt), { text: item.text }));
  }

  return ensureSentence(fill(pick(topicPhrases, seed, salt), { text: item.text }));
}

function narrateLifeItems(context: BriefingContext, seed: string) {
  if (context.lifeItems.length === 0) {
    return null;
  }

  const lines = [fill(pick(lifeIntros, seed, 'life-intro'), {})];

  context.lifeItems.forEach((item, index) => {
    lines.push(ensureSentence(fill(pick(lifeItemPhrases, seed, `life:${index}:${item.text}`), { text: item.text })));
  });

  return lines.join(' ');
}

function openingForContext(context: BriefingContext, seed: string) {
  if (context.place.name === 'General') {
    return fill(pick(generalOpeners, seed, 'general-opening'), {});
  }

  if (context.place.name === 'Custom briefing') {
    return fill(pick(customOpeners, seed, 'custom-opening'), {});
  }

  return fill(pick(placeOpeners, seed, 'place-opening'), { place: context.place.name });
}

export function narrateBriefing(context: BriefingContext) {
  const seed = baseSeed(context);

  if (context.people.length === 0) {
    if (context.lifeItems.length === 0) {
      return context.place.name === 'General'
        ? 'No current life updates are saved yet. Add a life update to generate a general overview.'
        : `No one is linked to ${context.place.name} yet. Add people to this place to generate a useful briefing.`;
    }

    const lifeSummary = narrateLifeItems(context, seed);
    const opening =
      context.place.name === 'General'
        ? openingForContext(context, seed)
        : `No one is linked to ${context.place.name} yet.`;

    return [opening, lifeSummary, pick(closings, seed, 'closing')].filter(Boolean).join(' ');
  }

  const peopleNames = context.people.map((person) => person.name);
  const sections = [
    [
      openingForContext(context, seed),
      fill(pick(peopleLeadIns, seed, 'people-lead-in'), { people: formatPeople(peopleNames) }),
    ].join(' '),
  ];

  context.people.forEach((person, personIndex) => {
    const personLines = [
      fill(pick(personIndex === 0 ? firstPersonTransitions : nextPersonTransitions, seed, `person:${person.name}`), {
        name: person.name,
      }),
    ];

    if (person.items.length === 0) {
      personLines.push(fill(pick(noItemPhrases, seed, `no-items:${person.name}`), { name: person.name }));
    } else {
      person.items.forEach((item, itemIndex) => {
        personLines.push(narrateItem(person.name, item, seed, itemIndex));
      });
    }

    sections.push(personLines.join(' '));
  });

  const lifeSummary = narrateLifeItems(context, seed);

  if (lifeSummary) {
    sections.push(lifeSummary);
  }

  sections.push(pick(closings, seed, 'closing'));

  return sections.join('\n\n');
}
