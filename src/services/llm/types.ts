export type LlmChatMessage = {
  content: string;
  role: 'system' | 'user';
};

export type LlmBriefingContext = {
  generatedAt: string;
  length: {
    approxWords: number;
    seconds: number;
    value: 'long' | 'medium' | 'short';
  };
  lifeItems: {
    createdAt: string;
    salience: number;
    text: string;
    tone: string;
    type: 'life';
  }[];
  people: {
    items: {
      salience: number;
      text: string;
      type: 'followup' | 'life' | 'recent' | 'topic';
    }[];
    lastContacted: string | null;
    name: string;
    presenceReason: string;
    relationshipHealth: number;
  }[];
  place: {
    name: string;
  };
};

export type BriefingLlmPrompt = {
  maxTokens: number;
  messages: LlmChatMessage[];
  temperature: number;
};

export type BriefingNarrationFailureReason =
  | 'generation-failed'
  | 'model-unavailable'
  | 'runtime-unavailable'
  | 'timeout'
  | 'validation-failed'
  | 'web-unavailable';

export type BriefingNarrationSuccess = {
  engine: 'llm';
  script: string;
};

export type BriefingNarrationFailure = {
  detail?: string;
  reason: BriefingNarrationFailureReason;
};

export type BriefingNarrationResult = BriefingNarrationFailure | BriefingNarrationSuccess;

export type BriefingLlmRuntime = {
  generate: (context: LlmBriefingContext, prompt: BriefingLlmPrompt) => Promise<string>;
};
