import { BundledModelUnavailableError, resolveBundledBriefingModelPath } from './model-manager';
import type { BriefingLlmPrompt, LlmBriefingContext } from './types';

type LlamaCompletionResult = {
  text?: string;
};

type LlamaContext = {
  completion: (
    params: {
      messages: BriefingLlmPrompt['messages'];
      n_predict: number;
      stop: string[];
      temperature: number;
      top_k: number;
      top_p: number;
    },
    onPartialCompletion?: (data: { token?: string }) => void,
  ) => Promise<LlamaCompletionResult>;
  release?: () => Promise<void> | void;
};

type LlamaRnModule = {
  initLlama: (options: {
    model: string;
    n_ctx: number;
    n_gpu_layers?: number;
    use_mlock?: boolean;
  }) => Promise<LlamaContext>;
};

const STOP_WORDS = [
  '</s>',
  '<|end|>',
  '<|eot_id|>',
  '<|end_of_text|>',
  '<|im_end|>',
  '<|EOT|>',
  '<|END_OF_TURN_TOKEN|>',
  '<|end_of_turn|>',
  '<|endoftext|>',
];

let activeContext: LlamaContext | null = null;
let activeModelPath: string | null = null;

async function loadLlamaRn(): Promise<LlamaRnModule> {
  try {
    const moduleName = 'llama.rn';
    // Optional native dependency: keep Metro/web builds working until the dev-client includes llama.rn.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(moduleName) as LlamaRnModule;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'llama.rn is not available in this build.');
  }
}

async function getPlatformOS() {
  try {
    const moduleName = 'react-native';
    // Optional native dependency: Node tests should not parse React Native internals.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Platform } = require(moduleName) as { Platform: { OS: string } };
    return Platform.OS;
  } catch {
    return 'web';
  }
}

async function getContext(modelPath: string, platformOS: string) {
  if (activeContext && activeModelPath === modelPath) {
    return activeContext;
  }

  if (activeContext?.release) {
    await activeContext.release();
  }

  const { initLlama } = await loadLlamaRn();
  activeContext = await initLlama({
    model: modelPath,
    n_ctx: 2048,
    n_gpu_layers: platformOS === 'ios' ? 99 : 0,
    use_mlock: true,
  });
  activeModelPath = modelPath;

  return activeContext;
}

export async function generateWithBundledLlm(_context: LlmBriefingContext, prompt: BriefingLlmPrompt) {
  const platformOS = await getPlatformOS();

  if (platformOS === 'web') {
    throw new Error('On-device LLM narration is native-only.');
  }

  let modelPath: string;

  try {
    modelPath = await resolveBundledBriefingModelPath();
  } catch (error) {
    if (error instanceof BundledModelUnavailableError) {
      throw error;
    }
    throw new Error(error instanceof Error ? error.message : 'Unable to resolve bundled briefing model.');
  }

  const llamaContext = await getContext(modelPath, platformOS);
  const result = await llamaContext.completion({
    messages: prompt.messages,
    n_predict: prompt.maxTokens,
    stop: STOP_WORDS,
    temperature: prompt.temperature,
    top_k: 30,
    top_p: 0.9,
  });

  return result.text ?? '';
}

export async function unloadBundledLlm() {
  if (activeContext?.release) {
    await activeContext.release();
  }

  activeContext = null;
  activeModelPath = null;
}
