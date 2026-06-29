import type { BriefingContext } from '@/features/forecast';
import type {
  CarPlayForecastData,
  CarPlayForecastSummary,
  CarPlayMenu,
  CarPlayPlaceOption,
  CarPlayPlaceOverview,
  CarPlayPlaybackState,
} from '@/features/carplay/types';

const FORECAST_MENU_ITEM = {
  id: 'forecast',
  imageUri: null,
  kind: 'forecast' as const,
  subtitle: 'Choose a place or general overview',
  title: 'Forecast',
};

const PEOPLE_PLACES_MENU_ITEM = {
  id: 'people-places',
  imageUri: null,
  kind: 'people-places' as const,
  subtitle: 'Quick reference only',
  title: 'People and Places',
};

function clampProgress(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function createCarPlayHomeMenu(): CarPlayMenu {
  return {
    title: 'Kwento Time',
    items: [FORECAST_MENU_ITEM, PEOPLE_PLACES_MENU_ITEM],
  };
}

export function createCarPlayForecastMenu(places: CarPlayPlaceOption[]): CarPlayMenu {
  return {
    title: 'Forecast',
    items: [
      {
        id: 'general',
        imageUri: null,
        kind: 'general-forecast',
        subtitle: 'General life overview',
        title: 'General',
      },
      ...places.map((place) => ({
        id: `place-${place.id}`,
        imageUri: place.avatarUri ?? null,
        kind: 'place-forecast' as const,
        subtitle: place.subtitle ?? null,
        title: place.name,
      })),
    ],
  };
}

export function createCarPlayPlaybackState(durationSeconds: number, elapsedSeconds: number): CarPlayPlaybackState {
  const safeDuration = Math.max(1, Math.round(durationSeconds));
  const safeElapsed = Math.max(0, Math.min(Math.round(elapsedSeconds), safeDuration));

  return {
    durationSeconds: safeDuration,
    elapsedSeconds: safeElapsed,
    progress: clampProgress(safeElapsed / safeDuration),
  };
}

export function createCarPlayForecastSummary({
  context,
  data,
  elapsedSeconds = 0,
  script,
}: {
  context: BriefingContext;
  data: CarPlayForecastData;
  elapsedSeconds?: number;
  script: string;
}): CarPlayForecastSummary {
  return {
    conversations: data.people.flatMap((person) =>
      person.conversations.slice(0, 1).map((conversation) => ({
        personName: person.name,
        summary: conversation.summary ?? 'Recent conversation saved.',
      })),
    ),
    lifeUpdates: context.lifeItems.map((item) => item.text),
    people: context.people.map((person) => {
      const retrievedPerson = data.people.find((candidate) => candidate.name === person.name);
      const summary = person.items[0]?.text ?? person.presenceReason;

      return {
        imageUri: retrievedPerson?.avatarUri ?? null,
        name: person.name,
        summary,
      };
    }),
    playback: createCarPlayPlaybackState(context.length.seconds, elapsedSeconds),
    script,
    title: data.place.name,
  };
}

export function createCarPlayPeoplePlacesMenu(places: CarPlayPlaceOverview[]): CarPlayMenu {
  return {
    title: 'People and Places',
    items: places.map((place) => ({
      id: `place-${place.id}`,
      imageUri: place.avatarUri ?? null,
      kind: 'people-places',
      subtitle:
        place.people.length === 0
          ? 'No linked people'
          : place.people.slice(0, 3).map((person) => person.name).join(', '),
      title: place.name,
    })),
  };
}
