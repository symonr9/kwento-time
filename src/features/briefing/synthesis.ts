import { generateBriefingNarration, type BriefingNarrationResult } from '@/services/llm';

import { narrateBriefing } from './narrator';
import type { BriefingContext } from './types';

export type BriefingScriptResult = {
  fallbackDetail?: string;
  fallbackReason?: Exclude<BriefingNarrationResult, { engine: 'llm' }>['reason'];
  script: string;
  source: 'llm' | 'template-fallback';
};

export async function createBriefingScript(
  context: BriefingContext,
  generateNarration: (context: BriefingContext) => Promise<BriefingNarrationResult> = generateBriefingNarration,
): Promise<BriefingScriptResult> {
  const llmResult = await generateNarration(context);

  if ('engine' in llmResult) {
    return {
      script: llmResult.script,
      source: 'llm',
    };
  }

  return {
    fallbackDetail: llmResult.detail,
    fallbackReason: llmResult.reason,
    script: narrateBriefing(context),
    source: 'template-fallback',
  };
}
