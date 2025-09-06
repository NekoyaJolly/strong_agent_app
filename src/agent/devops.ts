// src/agents/devops.ts
import { Agent } from '@openai/agents';
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';
import { DevOpsPlan } from './schemas.js';

export const devopsAgent = new Agent({
  name: 'DevOps/Release',
  instructions: `${RECOMMENDED_PROMPT_PREFIX}\nあなたはリリース担当です。Docker/CI/プレビューURL/ロールバック手順を提案してください。` ,
  outputType: DevOpsPlan,
});