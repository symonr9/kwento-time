# src/app - Expo Router routes

File-based routing. **Every file here is a screen or layout** that maps to a navigable route. This is the only place routing lives.

## Rules

- Keep route files **thin**. A screen wires navigation + layout and pulls data/logic from `@/features/<feature>` and `@/db/queries`. Business logic does **not** live here.
- `_layout.tsx` files define navigators and providers. The root layout owns app-level gates/providers such as theme, splash, migrations, and biometric lock.
- Typed routes are enabled (`experiments.typedRoutes`) - use generated `Href` types where practical.
- Folder names become path segments. Use `(group)` folders for layout grouping without a URL segment, and `[param]` for dynamic routes.
- Shared form/list controls come from `@/components`; feature-only screen pieces stay under `@/features/<feature>/components`.

## Current Route Shape

```
app/
  _layout.tsx              # root providers, migration gate, theme, splash
  (tabs)/index.tsx         # home / dashboard
  people/
    index.tsx              # people list/search/filter
    [id].tsx               # person properties
  conversations/
    add.tsx                # manual conversation logging
    [id].tsx               # conversation detail
    voice.tsx              # audio memo workflow
  places/
    index.tsx              # places list/search/filter
    [id].tsx               # place properties
  briefing/index.tsx       # Select by Place or Create Your Own, then playback
  follow-ups/index.tsx     # follow-up list
  icebreakers/index.tsx    # icebreaker CRUD/search/filter
  my-life/index.tsx        # life updates
  review/index.tsx         # Keep Current review workflow
  tags/index.tsx           # tag management
  topics/index.tsx         # talking points
  settings.tsx             # preferences + backup/import/export
```

Read https://docs.expo.dev/versions/v56.0.0/ for current Expo Router API before adding navigators.
