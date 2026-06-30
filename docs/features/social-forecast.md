# Feature Spec — Social Forecast (Spoken Place Briefing)

**Status:** Planned · **Tier:** Free (deterministic mode) + Premium (LLM mode) · **Owner:** TBD
**Related:** Place Mode ([src/features/places/](../../src/features/places/)), on-device AI direction in [PROJECT.md](../../PROJECT.md)

---

## 1. Summary

A one-tap, **hands-free spoken briefing** the user plays *before walking into a place* (a party, church, the office, a friend's house). It tells them **who they're likely to see**, surfaces **recent unresolved follow-ups**, recaps **recent conversations and life events**, and gives a **prioritized rundown of what to talk about** — a "social/conversation forecast."

The intelligence is split in two on purpose:

1. A **deterministic retrieval + scoring layer** pulls and ranks data from SQLite. **This is the only thing that touches the database.**
2. A **narrator** turns that ranked, bounded context into a spoken script — in one of two user-chosen modes (§8):
   - **Deterministic mode** (default · free · fully offline): a template narrator composes the script directly from the data. No model, no download, instant.
   - **Enhanced mode** (Premium · opt-in model download): an **on-device LLM** smooths the *same* context into more natural, varied narration. It only synthesizes/prioritizes/narrates — it never queries the DB, never invents people, never writes anything.

Output is read aloud via **text-to-speech**, auto-playing, designed for driving / eyes-free use. The user controls **how long** the briefing is and **how** data is retrieved (filters/form).

> **Hard rule:** the narrator — template *or* LLM — can only say what's in the retrieved context. The LLM is a **wording upgrade, not a source of facts**: both modes narrate the same facts, only the fluency differs.

---

## 2. User stories

- *"As I park outside a gathering, I tap one button and hear a 60-second rundown of who's likely there and what to bring up."*
- *"I want it short on the drive over — just the 3 most important people and any open follow-ups."*
- *"I want to choose a bigger, smarter voice model on Wi-Fi, or stick to the tiny built-in one offline."*
- *"I never want it to make up facts about my friends."*

---

## 3. UX flow

```
Home screen
  └─ [ Briefing ] button (large, prominent)
       └─ Forecast form (or "Quick briefing" using saved defaults)
            • Place  • Length  • Signal emphasis/preset  • Scope  • Model  • Voice
       └─ [ Generate ]
            → retrieval + scoring (fast, deterministic)
            → LLM synthesis (or template fallback)  [progress/spinner]
            → Playback screen: auto-plays via TTS
                 large controls: ⏯ Pause/Resume · ⏮ Replay · ⏹ Stop · 📝 Show transcript
```

**Hands-free / driving design**
- Big, high-contrast primary button; minimal taps to start.
- **Auto-play** the moment audio is ready (user already opted in by tapping Generate).
- Keep the screen awake during playback; route audio to the active output (car Bluetooth / speaker) via the OS.
- Show the full transcript as text for when the user is *not* driving (accessibility + trust/verification).
- Optional: a "Quick briefing" path that skips the form and uses saved defaults for a true one-tap experience.
- Future: CarPlay / Android Auto integration (out of scope for v1 — flagged).

---

## 4. Architecture — the pipeline

```
                deterministic, testable, the ONLY DB consumer
  ┌───────────────────────────────────────────────────────────────┐
  │  1. RETRIEVAL          2. SCORING            3. CONTEXT          │
  │  SQLite queries  ──▶   rank people & items ──▶ bounded JSON      │
  │  (by place+filters)    by weighted signals    (length-budgeted)  │
  └───────────────────────────────────────────────────────────────┘
                                   │  structured facts only
                                   ▼
                       4. SYNTHESIS (narration)
                 offline LLM  ──OR──  template narrator
                 (reads context, writes a spoken script; no DB access)
                                   │  plain-text script
                                   ▼
                       5. TTS PLAYBACK (expo-speech)
                       auto-play, hands-free controls
```

| Stage | Lives in | Touches DB? | Deterministic? |
|-------|----------|-------------|----------------|
| 1. Retrieval | `src/db/queries/forecast.ts` | **Yes (only here)** | Yes |
| 2. Scoring | `src/features/forecast/scoring.ts` | No (pure) | Yes |
| 3. Context assembly | `src/features/forecast/context.ts` | No (pure) | Yes |
| 4. Synthesis | `src/services/llm/` (+ template fallback in `forecast/`) | **No** | LLM: no / template: yes |
| 5. TTS playback | `src/services/speech/` | No | n/a |

---

## 5. Deterministic retrieval layer

Given `{ placeId, at: Date, filters }`, retrieve candidate **people** and their candidate **items**. Pure SQL via the query layer — no LLM involvement.

- **People candidates:** everyone linked to the place via `personPlaces` (+ optionally people with strong recent interaction even if unlinked, if the filter allows). 
- **Per-person items** (the raw material for talking points):
  - **Follow-ups:** **only the most recent unresolved follow-ups** (e.g. top 1–2 by `createdAt desc, resolved = false`). *(Explicit requirement: only the most recent follow-ups are added.)*
  - **Topics:** active / expiring topics (fresher and expiring-soon rank higher).
  - **Recent conversations:** latest summary/snippet for recap.
  - **Recent life events:** recent extracted events (future `life_events` table; until then, parsed from conversation summaries).
  - **Shared interests:** overlap between the person's tags/interests and the user's own.
- Retrieval is **bounded** (caps per person and item type) so the context never balloons regardless of history size.

---

## 6. Scoring model

Two scores, both a weighted sum of **normalized [0,1] signals**. Weights come from the form (presets + advanced sliders), so the user "maps how the AI retrieves/prioritizes."

### 6a. Presence score `P(person)` — *who you'll likely see*
Determines inclusion and ordering of people.

| Signal | Meaning |
|--------|---------|
| `placeAffinity` | Strength of the person↔place link (`isPrimary` weighted higher) + historical conversation count associated with the place. |
| `timing` | Regular-at-this-time/day patterns (future; v1 uses place link + recency). |

People above a threshold or the top-N (per the form's "max people") are included.

### 6b. Salience score `S(item)` — *what to talk about*
Ranks each candidate item across included people.

| Signal | Default weight | Rationale |
|--------|:--:|-----------|
| `unresolvedFollowUp` | 0.25 | Open loops are the highest-value, most concrete thing to raise. |
| `topicFreshness` | 0.20 | Active/expiring topics are timely; expiring-soon ranks highest. |
| `recencyOfInteraction` | 0.15 | Recent context is more relevant and accurate. |
| `recentEvent` | 0.15 | New life events are natural, caring conversation starters. |
| `relationshipHealth` | 0.10 | Tunable: "reconnect mode" boosts *fading* ties; "balanced" is neutral. |
| `sharedInterest` | 0.10 | Common ground makes conversation easy. |
| `calendarTiming` | 0.05 | Birthdays/anniversaries within a window get a boost. |

`S(item) = Σ weightᵢ · signalᵢ`. Weights are normalized; presets set them, advanced mode exposes sliders.

### 6c. Selection within the length budget
The chosen **length** sets a word/item budget. Selection:
1. Take top people by `P` (capped by "max people").
2. Within budget, pick highest-`S` items, **round-robin across people** so coverage isn't dominated by one person.
3. Stop when the budget is filled. Pass the selected, ranked set to synthesis.

| Length | ~Duration | ~Words (≈150 wpm) | ~People | ~Items | LLM max tokens |
|--------|:--:|:--:|:--:|:--:|:--:|
| Short | ~30s | ~75 | 2–3 | ~4 | ~120 |
| Medium | ~60s | ~150 | 3–5 | ~7 | ~220 |
| Long | ~120s | ~300 | 5–8 | ~12 | ~420 |

---

## 7. Filter / form options

Maps directly onto retrieval, scoring, length, and output.

| Group | Option | Effect |
|-------|--------|--------|
| **Place & time** | Place picker; "arriving now" vs a specific time | Retrieval scope + `timing`/`calendarTiming` signals |
| **Length** | Short / Medium / Long (or a seconds slider) | Word/item/token budget (§6c) |
| **Emphasis preset** | Reconnect · Deep prep · Quick catch-up · Custom | Sets the §6b weight vector |
| **Advanced weights** | Per-signal sliders (Custom preset) | Overrides individual weights |
| **People scope** | Max people; include "maybes" (weakly-linked); tag filter | Presence threshold + candidate set |
| **Content filters** | Include/exclude follow-ups, topics, events, interests; tone filter (light/medium/personal) | Item categories retrieved |
| **Narration mode** | Deterministic (free) · On-device LLM (Premium, w/ free trial) · *(advanced)* Remote Ollama; plus model & voice pickers | Selects the synthesis engine (§8) |
| **Voice** | TTS voice, rate/pitch | Playback (§10) |

Defaults are saved (proposed `forecast_preferences`) so "Quick briefing" needs zero configuration.

---

## 8. Synthesis (narration)

Input: the bounded **BriefingContext** (§9). Output: a plain-text spoken **script**. The narrator runs in one of three engines; the first is the default and the guaranteed floor of quality.

### 8a. Deterministic mode — no LLM (default · free)
A pure function in `src/features/forecast/narrator.ts` stitches the ranked context into natural sentences from templates (e.g. *"You'll likely see {name}. Last time you talked about {topic}, and you still owe them {followup}."*). No model, no download, no network — instant and identical every run. This is the **default**, works on every device, and ships **first** (before any LLM work). Even when Enhanced mode is on, this is the fallback whenever the model is missing, disabled, or fails validation.

### 8b. Enhanced mode — on-device LLM (Premium · opt-in download)
The user downloads a small GGUF model (§10); `src/services/llm` rewrites the *same* `BriefingContext` into smoother, more varied, more human narration. Fully offline once downloaded.
- **Engine: `llama.rn`** (GGUF). Prompt: a fixed system template — *"You are a briefing assistant. Narrate a concise, warm spoken briefing for the user before they arrive at {place}. Use ONLY the facts below, in priority order. ~{words} words. Conversational, second person, no bullet lists, easy to listen to while driving. Do not invent names or facts."* — then the serialized context.
- **Guardrails:** low temperature; hard token cap from the length budget; **name validation** — if the output names a person not in the context, discard it and fall back to 8a. The LLM can never drop factual accuracy below deterministic mode.

### 8c. Remote Ollama — advanced / online (optional · not default)
For power users running **[Ollama](https://ollama.com) on their own desktop/home server**, the app can call that server's HTTP API as the narration engine for top-tier quality. **Online and opt-in** — *not* the offline default; it sends the (already-bounded) context to the user's own machine, so data stays under their control but connectivity is required. Clearly labelled; never relied on for hands-free driving without a connection. (Ollama cannot run on the phone itself — see §10.)

### Monetization

| Mode | Tier |
|------|------|
| Deterministic (8a) | **Free** — always available, fully offline. |
| On-device LLM (8b) | **Premium**, with a **free trial** (e.g. first _N_ briefings or a short time window — exact mechanic TBD) so users feel the upgrade before paying. |
| Remote Ollama (8c) | Premium / advanced; requires the user's own Ollama server. |

---

## 9. BriefingContext schema (passed to synthesis)

Bounded, plain data — never the raw DB, never unbounded history.

```ts
type BriefingContext = {
  place: { name: string };
  generatedAt: string;           // ISO
  length: { seconds: number; approxWords: number };
  people: Array<{
    name: string;
    relationshipHealth: number;  // 0–100
    lastContacted: string | null;
    presenceReason: string;      // e.g. "primary place"
    items: Array<{
      type: 'followup' | 'topic' | 'event' | 'interest' | 'recent';
      text: string;              // human-readable fact
      salience: number;          // 0–1, for ordering
    }>;
  }>;
};
```

---

## 10. Model management

> **Policy: no model is ever bundled in the app binary.** Models are **downloaded after install**, on demand, into app storage. This keeps the binary/download small (the iOS over-the-air install cap is ~200 MB), means only users who opt into Enhanced mode pay the storage cost, and lets us add/upgrade models without shipping a new build.

- **On-device runtime: `llama.rn`** (GGUF). The first time a user enables Enhanced mode, they pick and download a model — an **"Ollama-style" in-app pull**: browse the registry → download → use.
- **Default download:** a tiny model in the **~50–100 MB** class — e.g. **SmolLM2-135M-Instruct GGUF** (Q4_K_M ≈ 105 MB, Q3_K_M ≈ 94 MB). Usable for narration given §8b's guardrails; weak in the open-ended sense.
- **Optional larger models (user choice):** SmolLM2-360M (~270 MB) or Qwen2.5-0.5B-Instruct (~400 MB) for better fluency, on Wi-Fi.
- **Registry & download:** entries of `{ id, name, size, quant, sourceUrl, checksum }`. Download via `expo-file-system`; show size + progress; verify checksum; allow delete. Proposed `ai_models` table (or a file-system manifest).
- **Sources:** Hugging Face direct GGUF URLs or a Cloudflare R2 / CDN mirror.

> **About Ollama (your preference).** Ollama is a **desktop/server** runtime — it does **not** run on iOS/Android, so it can't be the on-device engine. Every "Ollama on mobile" app is really a *client to an Ollama server running elsewhere*. We honor the preference two ways: **(1) as your dev tool** — use Ollama on your machine to discover/pull/test/quantize candidate models, then export the GGUF and host it for the app to download; **(2) optional remote backend** (§8c) — users can point the app at their own Ollama server when online. On-device inference uses `llama.rn` + GGUF, wrapped in an Ollama-style pull UX so it *feels* like Ollama.

- **Tradeoffs to surface in-app:** bigger model = better wording but more storage, RAM, battery/thermal, slower first token. Default stays tiny; deterministic mode (§8a) needs no model at all.

---

## 11. TTS & hands-free playback

- **Engine: `expo-speech`** — uses the OS TTS engine, **offline**, supports voice/rate/pitch selection. No extra model needed for v1.
- **Auto-play** when the script is ready; **keep-awake** during playback (`expo-keep-awake`).
- **Controls:** Pause/Resume, Replay, Stop, Show transcript — large targets.
- **Audio routing:** the OS sends speech to the active output (car Bluetooth, headphones, speaker). Configure the audio session so briefing audio behaves well with other audio (consider ducking music rather than stopping it).
- **Future upgrade:** neural offline TTS (Piper / Kokoro) for a warmer voice; CarPlay / Android Auto. Out of scope for v1.

---

## 12. Proposed data-model additions (future migrations)

Generate with `npm run db:generate` when implemented (see [src/db/CLAUDE.md](../../src/db/CLAUDE.md)). None block the deterministic MVP, which can run on existing tables.

| Table | Purpose |
|-------|---------|
| `forecast_preferences` | Saved default filters, weight preset, length, model, voice (one row / singleton). |
| `life_events` | Structured recent events per person (better than parsing summaries) → powers `recentEvent`. |
| `interests` (or extend `tags`) | Represent user + person interests for `sharedInterest`. |
| `ai_models` | On-device model registry: id, name, size, quant, source, checksum, downloaded state. *(Could be a file manifest instead.)* |
| `briefings` (optional) | History/cache of generated briefings (context + script + timestamp) for replay and debugging. |

---

## 13. Code layout

| Path | Responsibility |
|------|----------------|
| `src/db/queries/forecast.ts` | Deterministic retrieval queries (the only DB access). |
| `src/features/forecast/scoring.ts` | Pure presence/salience scoring (unit-tested). |
| `src/features/forecast/context.ts` | Pure selection + BriefingContext assembly within budget. |
| `src/features/forecast/narrator.ts` | Deterministic narrator — the default (8a) **and** the LLM fallback (pure). |
| `src/features/forecast/hooks/` | Orchestration hook (retrieve → score → synthesize → play). |
| `src/features/forecast/components/` | Forecast form + playback UI. |
| `src/services/llm/` | On-device LLM runtime wrapper + model manager (download/load/generate). |
| `src/services/speech/` | TTS + playback/session control. |
| `src/app/forecast/` | Route(s): form + playback screen; entry button on home. |

Dependency direction holds: features → services/db; the LLM service has no DB access. See [src/features/forecast/CLAUDE.md](../../src/features/forecast/CLAUDE.md) and [src/services/llm/CLAUDE.md](../../src/services/llm/CLAUDE.md).

---

## 14. Phased implementation

1. **Deterministic MVP (no LLM):** retrieval + scoring + context + **template narrator** + `expo-speech` playback + basic form. Ships value immediately, fully offline, fully deterministic.
2. **Length & form polish:** presets, advanced weight sliders, saved preferences, hands-free playback controls + keep-awake + audio routing.
3. **On-device LLM (Premium):** integrate `llama.rn`; **download** (never bundle) the tiny default model on opt-in; LLM synthesis with the deterministic narrator as fallback + name-validation guardrail; Premium gating + free trial.
4. **Model registry:** downloadable larger models with size/quality tradeoffs surfaced; Ollama-style pull UX; user selection.
5. **Stretch:** structured `life_events`, semantic shared-interest matching, neural TTS, CarPlay/Android Auto.

---

## 15. Risks, tradeoffs & open questions

**Risks/tradeoffs**
- Tiny LLM fluency/hallucination → mitigated by narration-only scope, low temperature, name-validation, deterministic fallback. Deterministic mode is always available, so quality never falls below a known floor.
- Native module (llama.rn) → dev-client rebuild, battery/thermal cost; gate behind Premium, lazy-load, keep default model tiny.
- App size → **no model ships in the binary** (§10). Deterministic mode needs no model; Enhanced-mode models are downloaded post-install on opt-in.
- Driving safety/UX → auto-play, minimal taps, big targets; never require reading while moving.

**Decided**
- **No model in the app binary** — all models download post-install on opt-in (§10).
- **Two user-facing modes**: deterministic (free, offline, default) and on-device LLM (Premium, free trial); remote Ollama is an optional advanced/online backend (§8).

**Open questions (confirm before/while building)**
1. **Presence vs health emphasis:** should "reconnect mode" prioritize *fading* relationships even if less likely present, or always gate on presence first? (Default: presence gates inclusion; health tunes ordering.)
2. **Free-trial mechanic for Enhanced mode:** count-based (first _N_ LLM briefings free) vs time-based (X days)? (Lean: count-based — the value is felt per-use, not on a clock.)
3. **Runtime:** confirm `llama.rn` vs `react-native-executorch` vs Cactus after a quick spike on a real device (latency, size, iOS/Android parity).
4. **Calendar context source:** birthdays from `Person.birthday` only, or integrate device calendar (adds a permission + scope)?
5. **"Likely to see" without check-ins:** with no location/check-in data yet, presence is inferred from place links + recency — is that sufficient for v1, or do we add lightweight check-ins?
