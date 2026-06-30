# Kwento Time — Project Charter

> Product + engineering charter. For **how the code is organized and the conventions**, see [CLAUDE.md](CLAUDE.md) and the per-folder `CLAUDE.md` files. For **how to run/build/ship**, see [README.md](README.md). Detailed feature specs live in [docs/](docs/).

---

## 1. Vision

Kwento Time (Filipino _kwento_ = story / chat) is a **mobile-first, local-first relationship intelligence app**. It helps people remember the humans in their life — who said what, what's going on with them, and what to follow up on — and primes them before social moments so conversations feel warm and effortless.

It is **not a CRM.** No pipelines, no contacts-as-leads. It is a private memory layer for personal relationships that works entirely offline.

**Core loop:** record → remember → prepare → connect → follow up.

---

## 2. Product principles

1. **Local-first, offline-always.** Every core feature works with no network. SQLite on the device is the source of truth.
2. **Privacy by design.** No accounts, no server-side user data — **the device is the identity.** Data is encrypted at rest by the OS. No telemetry of user content.
3. **AI on the boundary, opt-in.** AI augments; it never silently mutates data. The user confirms before anything is saved, and AI features degrade gracefully when models/network are absent.
4. **Warmth over management.** Language and UX are personal and kind, never salesy or "productivity-tool" cold.
5. **Performance is a feature.** Must stay fast with 1,000+ people and 10,000+ conversations on-device.

---

## 3. Target users & key use cases

- People who value relationships but struggle to recall details ("what did she say about her mom?").
- Networkers, organizers, pastors/community leaders, salespeople-as-humans, the socially conscientious.

**Use cases**
- Log a conversation (typed now; voice + AI extraction later) and trust it'll resurface.
- Before an event, get primed on who'll be there and what to talk about.
- Be nudged to follow up before a relationship goes cold.
- Track the user's own life ("How Are You?") so they can answer "how've you been?" well.

---

## 5. Feature goals

| Feature | Description | Status |
|---------|-------------|--------|
| People & profiles | CRUD, relationship health score, last-contacted | ✅ Phase 1 (data layer done) |
| People Tags | User-defined groupings (m:n) | Schema ready |
| Conversation logging | Manual text now; voice + AI later | ✅ manual (data layer) |
| On-device voice notes | expo-av record → Whisper.rn transcription (offline) → confirm | Planned |
| AI entity extraction | GPT-4o extracts person/topics/events/follow-ups after user confirms transcript | Planned |
| Topic expiry system | active → expiring (7d) → extended → archived; 30-day timer | Schema ready |
| Place Mode | Swipeable card deck priming who's at a place & what to talk about | Schema ready |
| **Briefing (NEW)** | A spoken, hands-free place briefing — who you'll likely see, recent follow-ups, talking points — over a **deterministic retrieval + scoring layer**, narrated via TTS. **Deterministic mode is free & offline; an optional on-device LLM (Premium, free trial) smooths the narration.** See [docs/features/briefing.md](docs/features/briefing.md). | Planned |
| "How Are You?" | User's own life items tagged Light / Medium / Personal | Schema ready |
| Local notifications | Expiring topics, follow-ups, relationship nudges (no server) | Planned |
| Biometric lock | Face ID / Touch ID on app open | Planned |
| Backup / export | iCloud / Cloudflare R2 / manual JSON; GDPR export & delete | Planned |

---

## 6. Tech stack

| Layer | Choice | Notes |
|-------|--------|-------|
| App framework | **Expo SDK 56**, Expo Router (typed routes), React 19, React Native 0.85 | Development builds (no Expo Go). Read [versioned docs](https://docs.expo.dev/versions/v56.0.0/) before writing native code. |
| Database | **expo-sqlite** | Single on-device SQLite file, WAL, FK-enforced. |
| ORM / migrations | **Drizzle ORM + Drizzle Kit** | Schema-first, type-safe; runtime migrations via `<MigrationGate>`. |
| On-device transcription | **Whisper.rn** | Offline, free; for voice notes. |
| Cloud extraction AI | **OpenAI GPT-4o** (via SDK, optionally Cloudflare Worker proxy) | Only AI surface that uses the network; opt-in, post-confirmation. |
| **On-device LLM (NEW)** | **llama.rn** (GGUF) — optional, Premium | Smooths Briefing narration (Enhanced mode); **fully offline, downloaded post-install — never bundled in the binary.** Deterministic mode needs no model. Alternatives: react-native-executorch, Cactus. Native module → dev-client rebuild; no Expo Go / web. |
| **Text-to-speech (NEW)** | **expo-speech** (OS TTS, offline) | Hands-free briefing playback. Neural offline TTS (Piper/Kokoro) is a future upgrade. |
| Background jobs | Expo Background Fetch + Task Manager | Nightly health-score recompute, topic-expiry checks, reminder scheduling. |
| Notifications | **expo-notifications** (local only) | No Expo Push server. |
| Security | **expo-local-authentication** + OS encryption-at-rest | Biometric lock; iOS Keychain / Android Keystore. |
| Builds / delivery | **EAS Build + EAS Submit + EAS Update** | iOS built in cloud (dev on Windows); OTA JS updates. |

### Two distinct AI surfaces (do not conflate)

| | **Capture-time extraction** | **Briefing-time narration** |
|---|---|---|
| Model | Cloud GPT-4o | Deterministic templates (default) **or** offline tiny LLM (llama.rn, Premium) |
| When | After user confirms a transcript | When user taps "Briefing" |
| Job | Extract structured data (person/topics/events/follow-ups) | Synthesize/prioritize/narrate already-retrieved data |
| Network | Yes (opt-in) | **No — fully offline** |
| Writes DB? | Yes (structured rows) | **Never** |

---

## 7. Infrastructure

Deliberately minimal — the product is local-first, optimizing for fast iteration over cloud ops.

- **No application backend.** No servers, no job queue, no user database. All compute (scoring, expiry, briefings) runs on-device.
- **Optional Cloudflare Worker** — a thin proxy that holds the OpenAI key as a Worker secret so it never ships in the app bundle. The only "service" we operate, and only for capture-time extraction.
- **Model distribution (Briefing — Enhanced mode only):**
  - **No model is bundled in the app binary** — models download post-install, on opt-in, via `expo-file-system`.
  - Default ~50–100 MB tiny model (e.g. SmolLM2-135M-Instruct GGUF); optional larger models the user chooses, from **Hugging Face** GGUF URLs or a **Cloudflare R2 / CDN** mirror.
  - **Ollama** runs on desktop/servers only (not on-device): used as a dev-side model lab and optionally as a remote backend power users connect to. On-device inference is `llama.rn` + GGUF.
- **Backup / recovery:** optional iCloud sync or Cloudflare R2, plus manual JSON export/import. GDPR export & full-delete built in.
- **CI/CD:** EAS Build (iOS in cloud from Windows), EAS Submit to App Store / TestFlight, EAS Update for OTA JS.

---

## 8. Data model (overview)

Single SQLite DB via Drizzle. Core entities (see [src/db/schema/](src/db/schema/)):

`Person` · `Tag` + `PersonTag` (m:n) · `Place` + `PersonPlace` (m:n, `isPrimary`) · `Conversation` (raw transcript + GPT-4o summary + audio URI) · `Topic` · `TopicExpiry` (lifecycle) · `FollowUp` · `Reminder` · `MyLifeItem`.

**Likely additions for Briefing** (future migrations — see the feature spec for detail): a structured `life_events` table, an `interests` representation for "shared interests," `briefing_preferences` (default filters/weights/length/voice), an on-device `ai_models` registry (or file-system-backed), and optional `briefings` history/cache.

---

## 9. Non-functional requirements

- **Privacy/Security:** no PII leaves the device except opt-in GPT-4o extraction and opt-in backup. Biometric lock. Never log user content to analytics. Never commit secrets ([CLAUDE.md](CLAUDE.md) → Secrets).
- **Performance:** list/detail queries stay fast at 1,000+ people / 10,000+ conversations (indexes, pagination, no N+1). Briefing generation target: retrieval+scoring < ~150 ms; LLM synthesis within a few seconds on a tiny model.
- **Offline:** all core flows + Briefing work in airplane mode.
- **Accessibility / hands-free:** Briefing is designed for driving — large targets, auto-play, voice output, minimal interaction.
- **App size:** be deliberate about bundling models; the iOS cellular-download cap (~200 MB) means bundling a large model hurts install conversion. Prefer a tiny bundled default + opt-in downloads.

---

## 10. Roadmap (build phases)

1. **Foundation** — Expo + Drizzle schema + SQLite init + People CRUD + manual conversation logging. ✅ *(data layer complete)*
2. **Voice capture** — expo-av recording → Whisper.rn transcription → confirmation UI.
3. **Cloud extraction** — GPT-4o entity extraction → Drizzle writes.
4. **Place Mode + "How Are You?"** — card deck + user life items.
5. **Engagement engine** — topic-expiry jobs + local notifications + health-score recompute.
6. **Hardening & launch** — biometric lock + freemium gating + backup/export + TestFlight/App Store.
7. **Briefing** — on-device LLM + deterministic retrieval/scoring + TTS hands-free briefings. *(Builds on Place Mode (4) and benefits from extraction (3); the deterministic layer can ship before the LLM via the template fallback.)*

---

## 11. Risks & tradeoffs

| Risk / tradeoff | Stance |
|---|---|
| **Tiny LLM quality.** ~100 MB models (135M params) are weak and can hallucinate or read awkwardly. | Constrain them to *narration only* over deterministic, factual context; ship a non-LLM template narrator as fallback; let users opt into larger models for better fluency. |
| **On-device LLM = native module.** Needs a dev-build rebuild; bigger binary; battery/thermal cost. | Accept; gate behind Premium; lazy-load the model; expose model choice + download so users control footprint. |
| **iOS dev from Windows.** No local iOS builds. | Use EAS cloud builds + physical iPhone (documented in README). |
| **Integer PKs vs UUIDs.** Simpler/faster but harder for multi-device record-merge sync. | Integer PKs now; revisit if record-level sync is ever needed (whole-DB iCloud backup is unaffected). |
| **AI cost creep on Premium.** Heavy loggers raise GPT-4o spend. | Track per-user cost; the briefing LLM is free (offline), so the marquee Premium feature has ~zero marginal cost. |

---

## 12. Success metrics (directional)

- Activation: % of new users who log ≥3 people and ≥1 conversation in week 1.
- Habit: weekly active loggers; follow-ups resolved per user.
- Briefing adoption: briefings generated/user/week; % played to completion.
- Conversion: free → Premium, with Briefing as a primary driver.
- Retention: D30 retention; relationship-health trend per active user.

---

## 13. Documentation map

| Doc | Purpose |
|-----|---------|
| [PROJECT.md](PROJECT.md) | This charter — product, business, tech, infra, roadmap. |
| [README.md](README.md) | Dev environment, build & deploy workflow, Drizzle commands. |
| [CLAUDE.md](CLAUDE.md) | Architecture, conventions, secrets policy (engineering guide). |
| `src/**/CLAUDE.md` | Per-folder responsibilities and rules. |
| [docs/features/briefing.md](docs/features/briefing.md) | Detailed Briefing feature spec. |
