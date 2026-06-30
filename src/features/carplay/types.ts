import type { BriefingRetrievedData } from '@/features/briefing';

export type CarPlayMenuItemKind = 'briefing' | 'general-briefing' | 'people-places' | 'place-briefing';

export type CarPlayMenuItem = {
  id: string;
  imageUri: string | null;
  kind: CarPlayMenuItemKind;
  subtitle: string | null;
  title: string;
};

export type CarPlayMenu = {
  items: CarPlayMenuItem[];
  title: string;
};

export type CarPlayPlaybackState = {
  durationSeconds: number;
  elapsedSeconds: number;
  progress: number;
};

export type CarPlayBriefingSummary = {
  conversations: {
    personName: string;
    summary: string;
  }[];
  lifeUpdates: string[];
  people: {
    imageUri: string | null;
    name: string;
    summary: string;
  }[];
  playback: CarPlayPlaybackState;
  script: string;
  title: string;
};

export type CarPlayPlaceOption = {
  avatarUri?: string | null;
  id: number;
  name: string;
  subtitle?: string | null;
};

export type CarPlayPlaceOverview = {
  avatarUri?: string | null;
  id: number;
  name: string;
  people: {
    avatarUri?: string | null;
    name: string;
  }[];
};

export type CarPlayBriefingData = BriefingRetrievedData;
