import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Speech from 'expo-speech';

const BRIEFING_SPEECH_TAG = 'kwento-briefing-speech';
const DEFAULT_BRIEFING_RATE = 0.9;
const DEFAULT_BRIEFING_PITCH = 1.02;
const CHUNK_PAUSE_MS = 260;
const SECTION_PAUSE_MS = 520;
const MAX_CHUNK_LENGTH = 260;
let keepAwakeActivation: Promise<void> | null = null;
let isKeepAwakeActive = false;
let speechSessionId = 0;
let preferredVoiceId: string | null | undefined;

export type SpeechPlaybackCallbacks = {
  onDone?: () => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
  onStopped?: () => void;
};

type BriefingSpeechChunk = {
  pauseAfterMs: number;
  text: string;
};

async function activateBriefingKeepAwake() {
  keepAwakeActivation = activateKeepAwakeAsync(BRIEFING_SPEECH_TAG);

  try {
    await keepAwakeActivation;
    isKeepAwakeActive = true;
  } catch {
    isKeepAwakeActive = false;
  } finally {
    keepAwakeActivation = null;
  }
}

async function deactivateBriefingKeepAwake() {
  if (keepAwakeActivation) {
    await keepAwakeActivation.catch(() => {});
  }

  if (!isKeepAwakeActive) {
    return;
  }

  try {
    await deactivateKeepAwake(BRIEFING_SPEECH_TAG);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('has not activated yet')) {
      throw err;
    }
  } finally {
    isKeepAwakeActive = false;
  }
}

async function getPreferredBriefingVoiceId() {
  if (preferredVoiceId !== undefined) {
    return preferredVoiceId;
  }

  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const englishVoices = voices.filter((voice) => voice.language.toLowerCase().startsWith('en'));
    const candidateVoices = englishVoices.length > 0 ? englishVoices : voices;
    const enhancedVoice = candidateVoices.find((voice) => voice.quality === Speech.VoiceQuality.Enhanced);
    const namedNaturalVoice = candidateVoices.find((voice) =>
      ['samantha', 'ava', 'allison', 'susan', 'zoe', 'arthur', 'daniel', 'karen'].some((name) =>
        voice.name.toLowerCase().includes(name),
      ),
    );

    preferredVoiceId = enhancedVoice?.identifier ?? namedNaturalVoice?.identifier ?? candidateVoices[0]?.identifier ?? null;
  } catch {
    preferredVoiceId = null;
  }

  return preferredVoiceId;
}

function splitLongSentence(sentence: string) {
  if (sentence.length <= MAX_CHUNK_LENGTH) {
    return [sentence];
  }

  const clauses = sentence.split(/(?<=[,;:])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const clause of clauses) {
    const next = current ? `${current} ${clause}` : clause;

    if (next.length > MAX_CHUNK_LENGTH && current) {
      chunks.push(current);
      current = clause;
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function chunkBriefingScript(script: string): BriefingSpeechChunk[] {
  const sections = script
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);

  return sections.flatMap((section, sectionIndex) => {
    const sentences = section
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .flatMap(splitLongSentence);

    return sentences.map((sentence, sentenceIndex) => ({
      pauseAfterMs: sentenceIndex === sentences.length - 1 && sectionIndex < sections.length - 1 ? SECTION_PAUSE_MS : CHUNK_PAUSE_MS,
      text: sentence,
    }));
  });
}

function speakChunk(
  chunk: BriefingSpeechChunk,
  options: Speech.SpeechOptions,
  sessionId: number,
  callbacks: {
    onDone: () => void;
    onError: (error: Error) => void;
    onStart?: () => void;
    onStopped: () => void;
  },
) {
  Speech.speak(chunk.text, {
    ...options,
    onDone: callbacks.onDone,
    onError: (error) => callbacks.onError(error instanceof Error ? error : new Error(String(error))),
    onStart: callbacks.onStart,
    onStopped: () => {
      if (sessionId === speechSessionId) {
        callbacks.onStopped();
      }
    },
  });
}

export async function speakBriefingScript(script: string, callbacks: SpeechPlaybackCallbacks = {}) {
  const trimmedScript = script.trim();

  if (!trimmedScript) {
    return;
  }

  const sessionId = speechSessionId + 1;
  speechSessionId = sessionId;
  const chunks = chunkBriefingScript(trimmedScript);
  const voiceId = await getPreferredBriefingVoiceId();
  let chunkIndex = 0;
  let hasStarted = false;

  await Speech.stop();
  await activateBriefingKeepAwake();

  const speechOptions: Speech.SpeechOptions = {
    pitch: DEFAULT_BRIEFING_PITCH,
    rate: DEFAULT_BRIEFING_RATE,
    useApplicationAudioSession: false,
    voice: voiceId ?? undefined,
    volume: 1,
  };

  const speakNextChunk = () => {
    if (sessionId !== speechSessionId) {
      return;
    }

    const chunk = chunks[chunkIndex];

    if (!chunk) {
      void deactivateBriefingKeepAwake();
      callbacks.onDone?.();
      return;
    }

    chunkIndex += 1;

    speakChunk(chunk, speechOptions, sessionId, {
      onDone: () => {
        if (sessionId !== speechSessionId) {
          return;
        }

        setTimeout(speakNextChunk, chunk.pauseAfterMs);
      },
      onError: (error) => {
        void deactivateBriefingKeepAwake();
        callbacks.onError?.(error);
      },
      onStart: hasStarted
        ? undefined
        : () => {
            hasStarted = true;
            callbacks.onStart?.();
          },
      onStopped: () => {
        void deactivateBriefingKeepAwake();
        callbacks.onStopped?.();
      },
    });
  };

  speakNextChunk();
}

export async function stopBriefingSpeech() {
  speechSessionId += 1;
  await Speech.stop();
  await deactivateBriefingKeepAwake();
}

export async function pauseBriefingSpeech() {
  await Speech.pause();
}

export async function resumeBriefingSpeech() {
  await Speech.resume();
}

export async function isBriefingSpeaking() {
  return Speech.isSpeakingAsync();
}
