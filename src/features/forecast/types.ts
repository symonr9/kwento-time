import type {
  ForecastRetrievedConversation,
  ForecastRetrievedData,
  ForecastRetrievedFollowUp,
  ForecastRetrievedLifeItem,
  ForecastRetrievedPerson,
  ForecastRetrievedTopic,
} from '@/db/queries/forecast';

export type ForecastLength = 'short' | 'medium' | 'long';

export type {
  ForecastRetrievedConversation,
  ForecastRetrievedData,
  ForecastRetrievedFollowUp,
  ForecastRetrievedLifeItem,
  ForecastRetrievedPerson,
  ForecastRetrievedTopic,
};

export type ForecastItemType = 'followup' | 'life' | 'topic' | 'recent';

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
