# Apple CarPlay

Kwento Time's CarPlay surface is an audio-first companion to Social Forecast. It is view-only: users choose what to hear and can quickly reference people/place associations, but all capture, editing, tagging, and relationship updates stay in the phone app.

## Platform boundary

CarPlay is not a normal Expo Router screen. It requires:

- Apple CarPlay entitlement approval for the app category.
- A native iOS CarPlay scene/template integration.
- A custom development client or prebuilt native app; Expo Go cannot run the integration.
- A native bridge such as `react-native-carplay`, or an app-owned Expo native module/config plugin if the library cannot support the required scene lifecycle.

Do not add CarPlay-only write flows. CarPlay must stay sparse, glanceable, and narration-led.

## Home

The CarPlay home template has two choices:

- Forecast
- People and Places

Every template includes a Back action to return to the previous CarPlay template.

## Forecast

Forecast shows:

- A General option with a distinct visual treatment for a general life overview.
- All existing places, using avatar images when available.

When a place is selected, the app retrieves the same deterministic Social Forecast context used by the phone app:

- People linked to the place.
- Previous conversations with those people.
- Open follow-ups and active talking points.
- Relevant life updates.

The selected forecast view should show only short summary text and start audio narration automatically only after explicit user action. Narration uses the deterministic `@/features/forecast` context and `@/services/speech` playback path. A progress line shows elapsed and remaining narration time.

## People and Places

This is a quick reference list:

- Places are top-level rows.
- Each place displays linked people, with profile avatars when available.
- It is read-only; edits happen in the phone app.

## Implementation Notes

`@/features/carplay` contains pure view-model builders for the native CarPlay template layer:

- `createCarPlayHomeMenu`
- `createCarPlayForecastMenu`
- `createCarPlayForecastSummary`
- `createCarPlayPlaybackState`
- `createCarPlayPeoplePlacesMenu`

The native layer should stay thin: it should call the existing DB retrieval functions, pass the returned facts through the forecast scorer/context/narrator, and render these view models in CarPlay templates.
