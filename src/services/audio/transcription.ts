import { initWhisper, type TranscribeOptions, type TranscribeResult } from 'whisper.rn';

export type TranscriptionSegment = {
  text: string;
  startMs: number;
  endMs: number;
};

export type TranscriptionResult = {
  language: string;
  segments: TranscriptionSegment[];
  text: string;
};

export type TranscribeAudioInput = {
  audioUri: string;
  language?: string;
  modelFilePath?: number | string;
};

export class TranscriptionUnavailableError extends Error {
  constructor(message = 'Local Whisper transcription is not configured.') {
    super(message);
    this.name = 'TranscriptionUnavailableError';
  }
}

const bundledWhisperModel: number | string | null = null;

export function isLocalTranscriptionConfigured() {
  return bundledWhisperModel !== null;
}

export async function transcribeAudio({
  audioUri,
  language = 'en',
  modelFilePath = bundledWhisperModel ?? undefined,
}: TranscribeAudioInput): Promise<TranscriptionResult> {
  if (!modelFilePath) {
    throw new TranscriptionUnavailableError(
      'Add a local Whisper model asset before using on-device transcription.',
    );
  }

  const whisperContext = await initWhisper({
    filePath: modelFilePath,
    useGpu: true,
  });

  try {
    const options: TranscribeOptions = { language };
    const { promise } = whisperContext.transcribe(audioUri, options);
    const result = await promise;

    return {
      language: result.language,
      segments: result.segments.map((segment: TranscribeResult['segments'][number]) => ({
        endMs: segment.t1,
        startMs: segment.t0,
        text: segment.text,
      })),
      text: result.result.trim(),
    };
  } finally {
    await whisperContext.release();
  }
}
