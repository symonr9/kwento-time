import type {
  ForecastRetrievedConversation,
  ForecastRetrievedData,
  ForecastRetrievedFollowUp,
  ForecastRetrievedPerson,
  ForecastRetrievedTopic,
} from '@/db/queries/forecast';

export type ForecastLength = 'short' | 'medium' | 'long';

export type {
  ForecastRetrievedConversation,
  ForecastRetrievedData,
  ForecastRetrievedFollowUp,
  ForecastRetrievedPerson,
  ForecastRetrievedTopic,
};

export type ForecastItemType = 'followup' | 'topic' | 'recent';

export type ScoredForecastItem = {
  personId: number;
  salience: number;
  text: string;
  type: ForecastItemType;
};

export type ScoredForecastPerson = ForecastRetrievedPerson & {
  items: ScoredForecastItem[];
  presenceReason: string;
  presenceScore: number;
};

export type BriefingContext = {
  generatedAt: string;
  length: {
    approxWords: number;
    seconds: number;
    value: ForecastLength;
  };
  people: {
    items: {
      salience: number;
      text: string;
      type: ForecastItemType;
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
