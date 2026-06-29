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
  constructor(message = 'Local Whisper transcription is not available on web.') {
    super(message);
    this.name = 'TranscriptionUnavailableError';
  }
}

export function isLocalTranscriptionConfigured() {
  return false;
}

export async function transcribeAudio(_input: TranscribeAudioInput): Promise<TranscriptionResult> {
  throw new TranscriptionUnavailableError(
    'Local Whisper transcription requires an iOS or Android development build.',
  );
}
