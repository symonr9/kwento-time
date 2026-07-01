export type StructuredConversationDraft = {
  followUps: string[];
  topics: string[];
};

function normalizeLine(value: string) {
  return value.replace(/\s+/g, ' ').trim().replace(/[.!]+$/, '');
}

function unique(values: string[]) {
  return [...new Set(values.map(normalizeLine).filter((value) => value.length > 0))];
}

function splitTranscriptIntoSentences(rawTranscript: string) {
  return (
    rawTranscript
      .split(/\n+/)
      .flatMap((line) => line.match(/[^.!?]+[.!?]?/g) ?? [])
      .map(normalizeLine)
      .filter((line) => line.length > 0)
  );
}

export function buildStructuredConversationDraft(rawTranscript: string): StructuredConversationDraft {
  const lines = splitTranscriptIntoSentences(rawTranscript);

  const followUps = unique(
    lines.filter((line) => line.endsWith('?') || /^(ask|follow up|check in|remember to)\b/i.test(line)),
  );

  const topicCandidates = lines.filter(
    (line) =>
      !followUps.includes(line) &&
      line.length >= 16 &&
      /\b(talked|mentioned|said|shared|working|planning|feeling|started|wants|needs|likes)\b/i.test(line),
  );

  return {
    followUps: followUps.slice(0, 6),
    topics: unique(topicCandidates).slice(0, 8),
  };
}
