import { BundledModelUnavailableError } from './model-manager';
import { buildBriefingPrompt } from './prompt';
import { generateWithBundledLlm } from './runtime';
import type { BriefingLlmRuntime, BriefingNarrationResult, LlmBriefingContext } from './types';
import { validateBriefingNarration } from './validation';

const DEFAULT_TIMEOUT_MS = 18000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('LLM narration timed out.'));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function classifyGenerationError(error: unknown): BriefingNarrationResult {
  const message = error instanceof Error ? error.message : String(error);

  if (error instanceof BundledModelUnavailableError) {
    return { detail: message, reason: 'model-unavailable' };
  }

  if (message.toLowerCase().includes('timed out')) {
    return { detail: message, reason: 'timeout' };
  }

  if (message.toLowerCase().includes('native-only')) {
    return { detail: message, reason: 'web-unavailable' };
  }

  if (message.toLowerCase().includes('llama.rn')) {
    return { detail: message, reason: 'runtime-unavailable' };
  }

  return { detail: message, reason: 'generation-failed' };
}

export async function generateBriefingNarration(
  context: LlmBriefingContext,
  {
    runtime = { generate: generateWithBundledLlm },
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: {
    runtime?: BriefingLlmRuntime;
    timeoutMs?: number;
  } = {},
): Promise<BriefingNarrationResult> {
  const prompt = buildBriefingPrompt(context);

  try {
    const generatedScript = await withTimeout(runtime.generate(context, prompt), timeoutMs);
    return validateBriefingNarration(generatedScript, context);
  } catch (error) {
    return classifyGenerationError(error);
  }
}

export { bundledBriefingModel } from './model-manager';
export { buildBriefingPrompt } from './prompt';
export { unloadBundledLlm } from './runtime';
export type {
  BriefingLlmPrompt,
  BriefingLlmRuntime,
  BriefingNarrationFailure,
  BriefingNarrationFailureReason,
  BriefingNarrationResult,
  BriefingNarrationSuccess,
  LlmBriefingContext,
} from './types';
export { validateBriefingNarration } from './validation';
