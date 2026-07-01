import type { BriefingNarrationFailure, BriefingNarrationSuccess, LlmBriefingContext } from './types';

const CAPITALIZED_SEQUENCE = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\b/g;
const COMMON_CAPITALIZED_WORDS = new Set([
  'A',
  'An',
  'And',
  'Ask',
  'Before',
  'Briefing',
  'But',
  'For',
  'Friday',
  'Here',
  'If',
  'In',
  'It',
  'Keep',
  'Last',
  'Monday',
  'No',
  'On',
  'One',
  'Saturday',
  'Start',
  'Sunday',
  'That',
  'The',
  'Then',
  'There',
  'This',
  'Thursday',
  'Tuesday',
  'Wednesday',
  'With',
  'You',
  'Your',
]);

function normalizeName(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function extractCapitalizedSequences(value: string) {
  return Array.from(value.matchAll(CAPITALIZED_SEQUENCE), (match) => match[0])
    .map((name) => {
      const words = name.trim().split(/\s+/);

      while (words.length > 1 && COMMON_CAPITALIZED_WORDS.has(words[0] ?? '')) {
        words.shift();
      }

      return words.join(' ');
    })
    .filter((name) => name.length > 1 && !COMMON_CAPITALIZED_WORDS.has(name));
}

function collectAllowedCapitalizedText(context: LlmBriefingContext) {
  const allowed = new Set<string>();
  const add = (value: string) => {
    const normalized = normalizeName(value);
    if (normalized) {
      allowed.add(normalized);
    }
  };

  add(context.place.name);
  context.people.forEach((person) => {
    add(person.name);
    person.name.split(/\s+/).forEach(add);
  });

  return allowed;
}

function countWords(script: string) {
  return script.split(/\s+/).filter(Boolean).length;
}

function failure(detail: string): BriefingNarrationFailure {
  return { detail, reason: 'validation-failed' };
}

export function validateBriefingNarration(
  script: string,
  context: LlmBriefingContext,
): BriefingNarrationFailure | BriefingNarrationSuccess {
  const trimmed = script.trim();

  if (!trimmed) {
    return failure('Generated narration was empty.');
  }

  const words = countWords(trimmed);
  const maxWords = Math.ceil(context.length.approxWords * 1.55 + 24);

  if (words > maxWords) {
    return failure(`Generated narration exceeded the word budget (${words}/${maxWords}).`);
  }

  if (/^\s*[-*#]|\n\s*[-*#]/.test(trimmed)) {
    return failure('Generated narration used markdown/list formatting.');
  }

  const allowedCapitalizedText = collectAllowedCapitalizedText(context);
  const unknownNames = extractCapitalizedSequences(trimmed).filter(
    (name) => !allowedCapitalizedText.has(normalizeName(name)),
  );

  if (unknownNames.length > 0) {
    return failure(`Generated narration mentioned unknown capitalized text: ${unknownNames.join(', ')}.`);
  }

  return {
    engine: 'llm',
    script: trimmed,
  };
}
