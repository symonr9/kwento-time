export type BundledBriefingModel = {
  checksumMd5: string | null;
  expectedSizeBytes: number | null;
  id: string;
  loadAssetModule: (() => number) | null;
  name: string;
  quantization: string;
  sizeBytesApprox: number;
};

export class BundledModelUnavailableError extends Error {
  constructor() {
    super('Bundled briefing model asset is not configured.');
    this.name = 'BundledModelUnavailableError';
  }
}

export const bundledBriefingModel: BundledBriefingModel = {
  checksumMd5: 'bc06d8c77458b8feb18301a760b374c7',
  expectedSizeBytes: 105454432,
  id: 'smollm2-135m-instruct-q4',
  // Lazy so Node tests do not try to execute the GGUF binary; Metro still sees it in native builds.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  loadAssetModule: () => require('@/assets/models/SmolLM2-135M-Instruct-Q4_K_M.gguf'),
  name: 'SmolLM2 135M Instruct Q4',
  quantization: 'Q4_K_M',
  sizeBytesApprox: 105454432,
};

function loadExpoAsset(): typeof import('expo-asset') {
  const moduleName = 'expo-asset';
  // Optional native dependency: only resolve the bundled model from native builds.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(moduleName) as typeof import('expo-asset');
}

function loadExpoFileSystem(): typeof import('expo-file-system') {
  const moduleName = 'expo-file-system';
  // Optional native dependency: Node tests should not parse React Native internals.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(moduleName) as typeof import('expo-file-system');
}

export async function resolveBundledBriefingModelPath(): Promise<string> {
  if (bundledBriefingModel.loadAssetModule === null) {
    throw new BundledModelUnavailableError();
  }

  const { Asset } = loadExpoAsset();
  const { File } = loadExpoFileSystem();
  const asset = Asset.fromModule(bundledBriefingModel.loadAssetModule());
  const downloadedAsset = await asset.downloadAsync();
  const localUri = downloadedAsset.localUri ?? downloadedAsset.uri;

  if (!localUri.startsWith('file://')) {
    throw new Error('Bundled briefing model did not resolve to a local file path.');
  }

  const modelFile = new File(localUri);

  if (!modelFile.exists) {
    throw new Error('Bundled briefing model file is missing from local storage.');
  }

  if (
    bundledBriefingModel.expectedSizeBytes !== null &&
    modelFile.size !== bundledBriefingModel.expectedSizeBytes
  ) {
    throw new Error(
      `Bundled briefing model size mismatch (${modelFile.size}/${bundledBriefingModel.expectedSizeBytes}).`,
    );
  }

  if (bundledBriefingModel.checksumMd5 !== null && modelFile.md5 !== bundledBriefingModel.checksumMd5) {
    throw new Error('Bundled briefing model checksum mismatch.');
  }

  return localUri;
}
