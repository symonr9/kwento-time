@AGENTS.md

# Agent Compatibility

This file is the canonical engineering guide for both Claude and Codex. Codex
should interpret every `CLAUDE.md` instruction as repository guidance, including
nested `CLAUDE.md` files in the directories it edits. When a heading or sentence
says "Claude", read it as "the coding agent" unless the instruction is
explicitly about a Claude-only tool or workflow.

# Context Budget

- Keep every `CLAUDE.md` high-signal and under about 200 lines. Prefer short bullets with stable rules over feature history or implementation play-by-play.
- Put rules at the narrowest useful path. Root guidance is for app-wide invariants; use nested `CLAUDE.md` files for service-, DB-, route-, or feature-specific constraints.
- Before adding new guidance, remove or update stale guidance nearby. Avoid duplicating the same rule in multiple files unless the local file materially changes how to apply it.
- Link to detailed specs/docs instead of copying them here. Agents should load deep docs only when working on that feature.

# Kwento Time

A mobile-first, **local-first** relationship intelligence app for iOS and Android. The name comes from the Filipino word _kwento_ (story / chat). It is **not a CRM** - it is a warm, personal relationship memory layer that works entirely offline.

**Core loop:** record -> remember -> prepare -> connect -> follow up.

Users log conversation notes via on-device AI voice input or text. The app remembers who said what, surfaces talking points before social events, and nudges users to follow up. **All data lives on the device.**

> **Product/business/infra charter:** [PROJECT.md](PROJECT.md). **Feature specs:** [docs/](docs/) (e.g. [Briefing](docs/features/briefing.md)). **This file** is the engineering guide (architecture + conventions).

## Read The Docs First

This project runs **Expo SDK 56** (React 19.2, React Native 0.85.3) - newer than most training data. Expo changes fast and APIs have moved. **Before writing any Expo / React Native code, read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/.** Do not rely on remembered API shapes. (Note: the original spec said "SDK 51+"; the template actually installed SDK 56 - defer to what is in `package.json`.)

## Architecture Principles

1. **Local-first, always offline.** Every feature must work with no network. Optional backup/sync is the only planned network surface. SQLite is the source of truth.
2. **Privacy by design.** No accounts, no auth server - **the device is the identity.** Data is encrypted at rest by the OS (iOS Keychain / Android Keystore). No telemetry of user content.
3. **AI is opt-in and on the boundary.** Transcription uses native/on-device speech-to-text. Do not add a transcription or capture-time API call. Persist both the raw transcript and local structured summary; raw transcript is the source of truth for re-processing.
4. **Determinism on-device.** Health scores, expiry, reminder scheduling, briefing retrieval, and review flows are deterministic local jobs.
5. **Performance is a feature.** Target 1,000+ people and 10,000+ conversation notes per device. Index deliberately, paginate/virtualize lists, avoid N+1 reads.

### Two Local Intelligence Surfaces - Keep Them Separate

| | Capture-time **structuring** | Briefing-time **narration** |
|---|---|---|
| Model | Native/on-device speech-to-text + deterministic local drafting | **Deterministic templates** (default, free) or offline tiny LLM (`llama.rn`, Premium + trial) |
| Job | Turn confirmed transcripts into suggested topics/follow-ups | Synthesize/prioritize/narrate already-retrieved data |
| DB access | Writes structured rows | **Never reads or writes the DB** |

**Deterministic-retrieval rule (Briefing):** a deterministic SQL + scoring layer retrieves and ranks the data; the LLM is a narrator over a fixed fact set and gets bounded context, never the database. A non-LLM template narrator must produce the same briefing when no model is present. See [docs/features/briefing.md](docs/features/briefing.md).

## Hybrid AI Pipeline

```
expo-audio record (on-device)
  -> native/on-device speech-to-text (no network)
  -> raw transcript written to SQLite immediately
  -> user reviews + confirms transcript
  -> deterministic local structuring suggestions
  -> user confirms suggested topics/follow-ups
  -> local notification scheduler triggered
```

Keep the UX instant: never block the UI on the network. Write the transcript before the confirmation step.

## Tech Stack

- **Expo SDK 56 + Expo Router** (file-based routing, typed routes enabled) - frontend.
- **expo-sqlite** - on-device database.
- **Drizzle ORM** (SQLite adapter) - typed, schema-first query builder.
- **expo-audio + native/on-device speech-to-text** - recording and local transcription. A future native library is okay if it stays offline.
- **llama.rn** - optional offline GGUF LLM for Enhanced Briefing narration. Native module -> dev-client rebuild, no Expo Go/web.
- **expo-speech** - offline OS text-to-speech for hands-free briefing playback.
- **expo-contacts** - permissioned contact import/binding, isolated in `@/services/contacts`.
- **Apple CarPlay (planned iOS native integration)** - audio-first Briefing + read-only People/Places reference. Spec: [docs/features/apple-carplay.md](docs/features/apple-carplay.md).
- **Expo Background Fetch** + scheduled tasks - nightly recompute (health scores, expiry, reminders).
- **expo-notifications** - local push (no Expo Push Service / server).
- **expo-local-authentication** - biometric lock on app open.
- **Manual JSON export/import** - backup & GDPR-ready export/delete.

Most native modules require SDK-56-compatible installs and dev-client/native builds. Add dependencies only as each build phase requires them.

## Data Model

Core entities: `Person`, `Place`, `PersonPlace`, `Conversation`, `Topic`, `TopicExpiry`, `FollowUp`, `FollowUpExpiry`, `Reminder`, `MyLifeItem`, `MyLifeItemExpiry`, `Icebreaker`, `Tag`, and polymorphic `ItemTag`.

Tags are shared labels across people, places, conversations, life updates, and icebreakers. Do not add one-off tag columns or item-specific tag tables for new taggable entities.

Topic, follow-up, and life-update expiry are surfaced together in the Keep Current review flow. See [src/db/CLAUDE.md](src/db/CLAUDE.md) for schema/migration rules.

## Secrets - Never Commit

- **No secrets in source, ever.** No API keys, tokens, passwords, certs, `.env` files, keystores (`*.jks`/`*.p12`/`*.p8`), or `*.mobileprovision` in committed files.
- **Load secrets from the environment**, not from code: use `expo-constants`, EAS env vars, or EAS Secrets for any future third-party service.
- **Before every commit, review `git status` and `git diff --staged`.** If a secret is ever committed, rotate it immediately; removing it later is not enough.
- Don't commit `node_modules/`, `.expo/`, generated `/ios` and `/android`, build output, or logs.

## Source Layout

| Path | Purpose |
|------|---------|
| [src/app/](src/app/CLAUDE.md) | Expo Router routes |
| [src/components/](src/components/CLAUDE.md) | Shared presentational UI |
| [src/constants/](src/constants/CLAUDE.md) | Theme, colors, spacing, fonts, constants |
| [src/hooks/](src/hooks/CLAUDE.md) | Shared React hooks |
| [src/db/](src/db/CLAUDE.md) | Drizzle schema, SQLite client, migrations, query layer |
| [src/features/](src/features/CLAUDE.md) | Domain feature modules |
| [src/services/](src/services/CLAUDE.md) | Device/external integrations |
| [src/lib/](src/lib/CLAUDE.md) | Pure utilities and helpers |
| [src/types/](src/types/CLAUDE.md) | Shared TypeScript types |

## Conventions

- **Filenames: `kebab-case`** for everything (`person-card.tsx`, `use-people.ts`).
- **Path alias: `@/*` -> `src/*`** and `@/assets/*` -> `assets/*`. Import with `@/...`, not deep relative paths.
- **TypeScript strict.** No `any`. Prefer Drizzle-inferred types over hand-written DB shapes.
- **Functional components + hooks** only. Co-locate feature-specific UI/logic in `src/features/<feature>/`; promote only once genuinely shared.
- **Buttons include icons by default.** Use `src/components/ui/icon-action-button.tsx` or an equivalent icon-bearing component.
- **DB access through Drizzle query syntax**; keep SQL/Drizzle in `src/db/queries/`, never components.
- **CarPlay stays audio-first and read-only.** Create/edit/delete flows remain in the phone app; native iOS scene/entitlement work stays behind a thin bridge.
- React Compiler is enabled - avoid manual `useMemo`/`useCallback` unless profiling shows a need.

## Build Order

Historical specs are in docs; do not treat this list as current implementation status.

1. Expo setup + Drizzle schema + SQLite init + People CRUD + manual conversation logging.
2. Audio recording -> native/on-device transcription -> confirmation UI.
3. Local transcript structuring -> Drizzle writes.
4. Places, life updates, tags, icebreakers, and review workflows.
5. Topic/follow-up/life-update expiry jobs + local notifications + health-score engine.
6. Biometric lock + freemium gating + backup/import/export + TestFlight/App Store.
7. **Briefing** - deterministic retrieval/scoring + template narrator + TTS, then optional on-device LLM.
8. **Apple CarPlay** - native iOS entitlement/scene bridge for Briefing and read-only People/Places.

## Developer Context

Built by a senior engineer (7 yrs production, large React Native / Expo / Node / GraphQL background). Treat suggestions as **production-grade**: prefer modern idiomatic patterns, flag tradeoffs, and prioritize on-device performance and data integrity.

## Commands

- `npm start` - Expo dev server; `npm run ios` / `npm run android` / `npm run web`
- `npm run lint` - Expo lint
- `npm run typecheck` - TypeScript check
- `npm run reset-project` - template reset script (rarely needed now)
