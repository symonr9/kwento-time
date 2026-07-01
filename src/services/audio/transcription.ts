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
};

export class TranscriptionUnavailableError extends Error {
  constructor(message = 'Native speech-to-text is not configured.') {
    super(message);
    this.name = 'TranscriptionUnavailableError';
  }
}

export function isLocalTranscriptionConfigured() {
  return false;
}

export async function transcribeAudio(_input: TranscribeAudioInput): Promise<TranscriptionResult> {
  throw new TranscriptionUnavailableError(
    'Native speech-to-text is planned for iOS and Android, but is not wired yet. You can enter the transcript manually for now.',
  );
}
