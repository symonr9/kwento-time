# Feature Spec — Social Forecast (Spoken Place Briefing)

**Status:** Planned · **Tier:** Premium · **Owner:** TBD
**Related:** Place Mode ([src/features/places/](../../src/features/places/)), on-device AI direction in [PROJECT.md](../../PROJECT.md)

---

## 1. Summary

A one-tap, **hands-free spoken briefing** the user plays *before walking into a place* (a party, church, the office, a friend's house). It tells them **who they're likely to see**, surfaces **recent unresolved follow-ups**, recaps **recent conversations and life events**, and gives a **prioritized rundown of what to talk about** — a "social/conversation forecast."

The intelligence is split in two on purpose:

1. A **deterministic retrieval + scoring layer** pulls and ranks data from SQLite. **This is the only thing that touches the database.**
2. An **offline tiny LLM** receives the already-retrieved, already-ranked, bounded context and **only synthesizes, prioritizes wording, and narrates** it. It never queries the DB, never invents people, and never writes anything.

Output is read aloud via **text-to-speech**, auto-playing, designed for driving / eyes-free use. The user controls **how long** the briefing is and **how** data is retrieved (filters/form).

> **Hard rule:** the LLM is a narrator over a fixed fact set. If it isn't in the retrieved context, it cannot be said. A non-LLM template narrator produces the same briefing when no model is available.

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
- Retrieval is **bounded** (caps per person/category) so the context never balloons regardless of history size.

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
| **Model** | Which on-device LLM (or template-only) | Synthesis engine (§8) |
| **Voice** | TTS voice, rate/pitch | Playback (§10) |

Defaults are saved (proposed `forecast_preferences`) so "Quick briefing" needs zero configuration.

---

## 8. Synthesis (narration)

Input: the bounded **BriefingContext** (§9). Output: a plain-text spoken **script**.

- **Engine: offline LLM via `llama.rn`** (GGUF). The LLM reads the context and writes a warm, second-person, list-free script within the word budget. It is explicitly instructed to **use only the provided facts**.
- **Prompt strategy:** a fixed system template — *"You are a briefing assistant. Narrate a concise, warm spoken briefing for the user before they arrive at {place}. Use ONLY the facts below, in priority order. ~{words} words. Conversational, second person, no bullet lists, easy to listen to while driving. Do not invent names or facts."* — followed by the serialized context.
- **Determinism guardrails:** low temperature; hard token cap; post-generation validation that no person name appears that wasn't in the context (reject/te­mplate-fallback if it does).
- **Template fallback (no model / model disabled / validation fail):** a pure function in `src/features/forecast/` stitches the same ranked context into natural sentences. This means **the feature ships and works before any LLM is integrated**, and always works offline.

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

- **Default:** a tiny bundled/first-run model in the **~50–100 MB** class — e.g. **SmolLM2-135M-Instruct GGUF** (Q4_K_M ≈ 105 MB; Q3_K_M ≈ 94 MB). Usable for templated narration; weak in the open-ended sense (acceptable given §8's guardrails).
- **Optional larger models (user choice):** e.g. SmolLM2-360M (~270 MB) or Qwen2.5-0.5B-Instruct (~400 MB) for better fluency, downloaded on Wi-Fi.
- **Registry & download:** a model registry (id, display name, size, quant, source URL, checksum). Download via `expo-file-system` to app storage; show size + progress; verify checksum; allow delete. Proposed `ai_models` table (or a file-system manifest).
- **Sources:** Hugging Face direct GGUF URLs or a Cloudflare R2/CDN mirror.
- **Tradeoffs to surface in-app:** bigger model = better wording but more storage, RAM, battery/thermal, slower first-token. Let the user decide; default stays tiny.

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
| `src/features/forecast/narrator.ts` | Template-fallback narrator (pure). |
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
3. **On-device LLM:** integrate `llama.rn`, bundle the tiny default model, swap the narrator for LLM synthesis with the template as fallback + name-validation guardrail.
4. **Model registry:** downloadable larger models with size/quality tradeoffs surfaced; user selection.
5. **Stretch:** structured `life_events`, semantic shared-interest matching, neural TTS, CarPlay/Android Auto.

---

## 15. Risks, tradeoffs & open questions

**Risks/tradeoffs**
- Tiny LLM fluency/hallucination → mitigated by narration-only scope, low temperature, name-validation, template fallback.
- Native module (llama.rn) → dev-client rebuild, larger binary, battery; gate behind Premium, lazy-load, keep default model tiny.
- App size vs quality → tiny bundled default + opt-in downloads.
- Driving safety/UX → auto-play, minimal taps, big targets; never require reading while moving.

**Open questions (confirm before/while building)**
1. **Presence vs health emphasis:** should "reconnect mode" prioritize *fading* relationships even if less likely present, or always gate on presence first? (Default: presence gates inclusion; health tunes ordering.)
2. **Default model bundling:** bundle the ~100 MB model in the binary (instant, bigger install) or download on first run (smaller install, needs network once)? (Lean: first-run download with a clear prompt.)
3. **Runtime:** confirm `llama.rn` vs `react-native-executorch` vs Cactus after a quick spike on a real device (latency, size, iOS/Android parity).
4. **Calendar context source:** birthdays from `Person.birthday` only, or integrate device calendar (adds a permission + scope)?
5. **"Likely to see" without check-ins:** with no location/check-in data yet, presence is inferred from place links + recency — is that sufficient for v1, or do we add lightweight check-ins?
