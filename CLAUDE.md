@AGENTS.md

# Agent Compatibility

This file is the canonical engineering guide for both Claude and Codex. Codex
should interpret every `CLAUDE.md` instruction as repository guidance, including
nested `CLAUDE.md` files in the directories it edits. When a heading or sentence
says "Claude", read it as "the coding agent" unless the instruction is
explicitly about a Claude-only tool or workflow.

# Kwento Time

A mobile-first, **local-first** relationship intelligence app for iOS and Android. The name comes from the Filipino word _kwento_ (story / chat). It is **not a CRM** — it is a warm, personal relationship memory layer that works entirely offline.

**Core loop:** record → remember → prepare → connect → follow up.

Users log conversation notes via on-device AI voice input or text. The app remembers who said what, surfaces talking points before social events, and nudges users to follow up. **All data lives on the device.**

> **Product/business/infra charter:** [PROJECT.md](PROJECT.md). **Feature specs:** [docs/](docs/) (e.g. [Briefing](docs/features/briefing.md)). **This file** is the engineering guide (architecture + conventions).

---

## ⚠️ Read the docs first

This project runs **Expo SDK 56** (React 19.2, React Native 0.85.3) — newer than most training data. Expo changes fast and APIs have moved. **Before writing any Expo / React Native code, read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/.** Do not rely on remembered API shapes. (Note: the original spec said "SDK 51+"; the template actually installed SDK 56 — defer to what is in `package.json`.)

---

## Architecture principles

1. **Local-first, always offline.** Every feature must work with no network. The only network call in the whole app is the optional GPT-4o extraction (and optional iCloud/R2 backup). SQLite is the source of truth.
2. **Privacy by design.** No accounts, no auth server — **the device is the identity.** Data is encrypted at rest by the OS (iOS Keychain / Android Keystore). No telemetry of user content.
3. **AI is opt-in and on the boundary.** Transcription (Whisper.rn) runs on-device for free. GPT-4o is called **only after the user confirms** a transcript. Both the raw transcript and the structured summary are persisted — the raw transcript is the source of truth for re-processing as prompts improve.
4. **Determinism on-device.** Health scores, topic expiry, and reminder scheduling are deterministic jobs that run locally (nightly background fetch). No backend job queue.
5. **Performance is a feature.** Target 1,000 users max, but each device may hold **1,000+ people and 10,000+ conversation notes.** Queries must stay fast at that scale — index deliberately, paginate lists, avoid N+1 reads.

### Two AI surfaces — keep them separate

| | Capture-time **extraction** | Briefing-time **narration** (Briefing) |
|---|---|---|
| Model | Cloud **GPT-4o** (opt-in, post-confirm) | **Deterministic templates** (default, free) **or** offline tiny LLM (`llama.rn`, Premium + trial — never bundled, downloaded post-install) |
| Job | Extract structured rows | Synthesize/prioritize/narrate already-retrieved data |
| DB access | Writes structured rows | **Never reads or writes the DB** |

**Deterministic-retrieval rule (Briefing):** a deterministic SQL + scoring layer retrieves and ranks the data; the LLM is a *narrator over a fixed fact set* and gets a bounded context, never the database. A non-LLM template narrator must produce the same briefing when no model is present. See [docs/features/briefing.md](docs/features/briefing.md).

## Hybrid AI pipeline (the critical path)

```
expo-av record (on-device)
  → Whisper.rn transcription (on-device, no network)
  → raw transcript written to SQLite immediately
  → user reviews + confirms transcript
  → GPT-4o entity extraction (direct from device, or via Cloudflare Worker proxy to mask the key)
  → structured data (person, topics, life events, follow-ups) written to SQLite
  → local notification scheduler triggered
```

Keep the UX instant: never block the UI on the network. Write the transcript before the confirmation step.

## Tech stack (actual)

- **Expo SDK 56 + Expo Router** (file-based routing, typed routes enabled) — frontend.
- **expo-sqlite** — on-device database.
- **Drizzle ORM** (SQLite adapter) — typed, schema-first query builder.
- **Whisper.rn** — on-device transcription (free, offline).
- **OpenAI SDK (GPT-4o)** — entity extraction, called from device (optionally via Cloudflare Worker proxy).
- **llama.rn** (GGUF on-device LLM) — Briefing narration, fully offline. Native module → dev-client rebuild, no Expo Go/web. Alternatives: react-native-executorch, Cactus.
- **expo-speech** — offline OS text-to-speech for hands-free briefing playback.
- **Apple CarPlay (planned iOS native integration)** — audio-first Briefing + read-only People/Places reference. Requires Apple entitlement approval plus a native CarPlay scene/template layer; Expo Go cannot run it. Spec: [docs/features/apple-carplay.md](docs/features/apple-carplay.md).
- **Expo Background Fetch** + scheduled tasks — nightly recompute (health scores, expiry, reminders).
- **expo-notifications** — local push (no Expo Push Service / server).
- **expo-local-authentication** — biometric lock (Face ID / Touch ID) on app open.
- Optional **iCloud sync / manual JSON export** — backup & GDPR-ready export/delete.

> Most of these are **not yet installed.** Only the Expo Router + UI baseline exists today. Add dependencies as each build phase requires them, pinning to SDK-56-compatible versions.

## Data model (core entities)

`Person` · `Tag` + `PersonTag` (m:n) · `Place` + `PersonPlace` (m:n, `isPrimary`) · `Conversation` (raw transcript, GPT-4o summary, audio path, timestamp) · `Topic` (talking point, tone, `isActive`) · `TopicExpiry` (lifecycle: active → expiring → extended → archived) · `FollowUp` (question, tone, `resolved`) · `Reminder` (`scheduledAt`, type, `sent`) · `MyLifeItem` (content, tone: light/medium/personal, `isActive`) · `Icebreaker` (long-form question text, tone: light/medium/personal).

All in a single on-device SQLite DB, accessed via Drizzle. See [src/db/CLAUDE.md](src/db/CLAUDE.md).

## Topic expiry lifecycle

30-day active timer → 7-day **"expiring"** window (nudge the user) → **archive** (or **extend** if the user acts). Tracked in the separate `TopicExpiry` table, advanced by the nightly background job.

## Freemium gating

- **Free:** 25 people, 1 place, 5 AI audio notes/month.
- **Premium ($4.99/mo, $39.99/yr):** unlimited people/places/notes, full topic-expiry system, smart nudge engine.

Gating logic is centralized (see `src/features/` / `src/services/`), not scattered across screens. Model AI cost per user (~$0.001–0.002/note) as a line item — free ≈ $0.01/user/mo; heavy premium up to $0.50–1.00/user/mo.

## 🔒 Secrets — NEVER commit

This app holds an **OpenAI API key** (GPT-4o extraction) and may hold Cloudflare Worker credentials and app-signing material. **None of it ever goes in the repo.**

- **No secrets in source, ever.** No API keys, tokens, passwords, certs, `.env` files, keystores (`*.jks`/`*.p12`/`*.p8`), or `*.mobileprovision` in committed files. They are git-ignored — keep them that way; never `git add -f` them.
- **Load secrets from the environment**, not from code: device-side use `expo-constants` / EAS env vars / EAS Secrets; never hard-code a key in a `.ts` file. Commit a `.env.example` with **blank** values to document required vars.
- **Prefer the Cloudflare Worker proxy** for the OpenAI key so the key never ships inside the app bundle (a bundled key is extractable from the binary). The Worker holds the key as a Worker secret.
- **Before every commit, review `git status` / `git diff --staged`.** If anything looks like a credential, stop. If a secret is ever committed, treat it as compromised: rotate the key immediately — removing it in a later commit is not enough (it stays in history).
- Don't commit `node_modules/`, `.expo/`, generated `/ios` & `/android`, build output, or logs — all git-ignored.

## Repo layout note

This Expo project lives at the **git repo root** (it was flattened out of a nested `kwento-time/kwento-time/` folder). A `Cloudflare Worker` (OpenAI key-proxy) may later live as a sibling — e.g. a top-level `worker/` directory — at which point consider a workspace/monorepo layout.

## Source layout

| Path | Purpose |
|------|---------|
| [src/app/](src/app/CLAUDE.md) | Expo Router routes (file-based screens & layouts) |
| [src/components/](src/components/CLAUDE.md) | Shared, presentational UI components |
| [src/constants/](src/constants/CLAUDE.md) | Theme, colors, spacing, app-wide constants |
| [src/hooks/](src/hooks/CLAUDE.md) | Shared React hooks |
| [src/db/](src/db/CLAUDE.md) | Drizzle schema, SQLite client, migrations, query layer |
| [src/features/](src/features/CLAUDE.md) | Domain feature modules (people, conversations, topics, places, voice, briefing, …) |
| [src/services/](src/services/CLAUDE.md) | Device/external integrations (AI, audio, llm, speech, notifications, background, auth, backup) |
| [src/lib/](src/lib/CLAUDE.md) | Pure utilities & helpers (no side effects) |
| [src/types/](src/types/CLAUDE.md) | Shared cross-cutting TypeScript types |

## Conventions

- **Filenames: `kebab-case`** for everything (`person-card.tsx`, `use-people.ts`, `health-score.ts`). Matches the existing template.
- **Path alias: `@/*` → `src/*`** and `@/assets/*` → `assets/*`. Import with `@/...`, not deep relative paths.
- **TypeScript strict.** No `any`. Prefer Drizzle-inferred types over hand-written DB shapes.
- **Functional components + hooks** only. Co-locate feature-specific UI/logic in `src/features/<feature>/`; promote to `src/components` or `src/hooks` only once genuinely shared.
- **Buttons include icons by default.** For new reusable or primary action buttons, use `src/components/ui/icon-action-button.tsx` or an equivalent icon-bearing component so actions are scannable and consistent.
- **Tags are shared labels.** Use `tags` plus the polymorphic `item_tags` table for people, places, conversations, life updates, and icebreakers; do not add one-off tag columns or item-specific tag tables for new taggable entities.
- **CarPlay stays audio-first and read-only.** Keep CarPlay templates sparse, use narration for briefing detail, show only short summary text/progress, and route all create/edit/delete flows back to the phone app. Shared logic belongs in `@/features/carplay`; native iOS scene/entitlement work must be isolated behind a thin bridge.
- **DB access through Drizzle query syntax**; drop to raw SQL only for complex aggregations (e.g. health-score multi-table joins). Never embed SQL strings in components — keep them in `src/db/queries/`.
- React Compiler is enabled — avoid manual `useMemo`/`useCallback` unless profiling shows a need.

## Build order

1. Expo setup + Drizzle schema + SQLite init + People CRUD + manual conversation logging.
2. Whisper.rn audio recording → confirmation UI.
3. GPT-4o entity extraction → Drizzle writes.
4. Place Mode + "How Are You?" page.
5. Topic-expiry jobs + local notification scheduling + health-score engine.
6. Biometric lock + freemium gating + iCloud sync / JSON export + TestFlight / App Store submission.
7. **Briefing** — deterministic retrieval + scoring + template narrator + TTS (ships first, offline), then on-device LLM synthesis + downloadable model registry. Builds on Place Mode (4); benefits from extraction (3). Spec: [docs/features/briefing.md](docs/features/briefing.md).
8. **Apple CarPlay** — native iOS entitlement/scene bridge for Briefing and read-only People/Places, powered by the same deterministic briefing context. Spec: [docs/features/apple-carplay.md](docs/features/apple-carplay.md).

## Developer context

Built by a senior engineer (7 yrs production, large React Native / Expo / Node / GraphQL background). Treat suggestions as **production-grade**: prefer modern idiomatic patterns, **flag tradeoffs rather than only the happy path**, and prioritise on-device performance and data integrity.

## Commands

- `npm start` — Expo dev server · `npm run ios` / `npm run android` / `npm run web`
- `npm run lint` — Expo lint
- `npm run reset-project` — template reset script (rarely needed now)
