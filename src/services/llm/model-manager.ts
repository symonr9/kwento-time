export type BundledBriefingModel = {
  assetModule: number | null;
  checksumSha256: string | null;
  id: string;
  name: string;
  quantization: string;
  sizeBytes: number;
};

export class BundledModelUnavailableError extends Error {
  constructor() {
    super('Bundled briefing model asset is not configured.');
    this.name = 'BundledModelUnavailableError';
  }
}

export const bundledBriefingModel: BundledBriefingModel = {
  assetModule: null,
  checksumSha256: null,
  id: 'smollm2-135m-instruct-q4',
  name: 'SmolLM2 135M Instruct Q4',
  quantization: 'Q4',
  sizeBytes: 110 * 1024 * 1024,
};

export async function resolveBundledBriefingModelPath(): Promise<string> {
  if (bundledBriefingModel.assetModule === null) {
    throw new BundledModelUnavailableError();
  }

  throw new BundledModelUnavailableError();
}
