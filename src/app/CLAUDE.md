# src/app — Expo Router routes

File-based routing. **Every file here is a screen or a layout** that maps to a navigable route. This is the only place routing lives — do not register routes anywhere else.

## Rules

- Keep route files **thin**. A screen wires navigation + layout and pulls data/logic from `@/features/<feature>` and `@/db`. Business logic does **not** live here.
- `_layout.tsx` files define navigators (tabs, stacks) and providers. The root `_layout.tsx` wraps the app in `ThemeProvider` and mounts the tab navigator.
- Typed routes are enabled (`experiments.typedRoutes`) — use the generated `Href` types; avoid stringly-typed `router.push` where possible.
- Folder names become path segments. Use `(group)` folders for layout grouping without a URL segment, and `[param]` for dynamic routes (e.g. `person/[id].tsx`).
- Auth/biometric gate: the biometric lock (expo-local-authentication) is enforced at the root layout level before rendering protected screens.

## Likely route shape (as features land)

```
app/
  _layout.tsx              # root: ThemeProvider, biometric gate, tab navigator
  index.tsx                # home / dashboard
  people/
    index.tsx              # people list
    [id].tsx               # person profile
  conversations/
    [id].tsx               # conversation detail / transcript review
  places/
    index.tsx
    [id].tsx               # Place Mode card deck
  how-are-you.tsx          # "How Are You?" — user's own life items
  settings/                # backup/export, premium, notifications
```

Read https://docs.expo.dev/versions/v56.0.0/ for current Expo Router API before adding navigators.
