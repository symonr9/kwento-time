import type {
  BriefingRetrievedConversation,
  BriefingRetrievedData,
  BriefingRetrievedFollowUp,
  BriefingRetrievedLifeItem,
  BriefingRetrievedPerson,
  BriefingRetrievedTopic,
} from '@/db/queries/briefing';

export type BriefingLength = 'short' | 'medium' | 'long';

export type {
  BriefingRetrievedConversation,
  BriefingRetrievedData,
  BriefingRetrievedFollowUp,
  BriefingRetrievedLifeItem,
  BriefingRetrievedPerson,
  BriefingRetrievedTopic,
};

export type BriefingItemType = 'followup' | 'life' | 'topic' | 'recent';

export type ScoredBriefingItem = {
  personId: number;
  salience: number;
  text: string;
  type: BriefingItemType;
};

export type ScoredBriefingPerson = BriefingRetrievedPerson & {
  items: ScoredBriefingItem[];
  presenceReason: string;
  presenceScore: number;
};

export type BriefingContext = {
  generatedAt: string;
  length: {
    approxWords: number;
    seconds: number;
    value: BriefingLength;
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
      type: BriefingItemType;
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
