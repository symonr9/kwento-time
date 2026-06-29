declare module 'whisper.rn' {
  export type TranscribeOptions = {
    language?: string;
    translate?: boolean;
    maxThreads?: number;
    nProcessors?: number;
    maxContext?: number;
    maxLen?: number;
    tokenTimestamps?: boolean;
    tdrzEnable?: boolean;
    wordThold?: number;
    offset?: number;
    duration?: number;
    temperature?: number;
    temperatureInc?: number;
    beamSize?: number;
    bestOf?: number;
    prompt?: string;
  };

  export type TranscribeResult = {
    isAborted: boolean;
    language: string;
    result: string;
    segments: {
      t0: number;
      t1: number;
      text: string;
    }[];
  };

  export type TranscribeFileOptions = TranscribeOptions & {
    onNewSegments?: (result: {
      nNew: number;
      totalNNew: number;
      result: string;
      segments: TranscribeResult['segments'];
    }) => void;
    onProgress?: (progress: number) => void;
  };

  export type WhisperContext = {
    release: () => Promise<void>;
    transcribe: (
      filePathOrBase64: number | string,
      options?: TranscribeFileOptions,
    ) => {
      promise: Promise<TranscribeResult>;
      stop: () => Promise<void>;
    };
  };

  export function initWhisper(options: {
    filePath: number | string;
    isBundleAsset?: boolean;
    useCoreMLIos?: boolean;
    useFlashAttn?: boolean;
    useGpu?: boolean;
  }): Promise<WhisperContext>;
}
