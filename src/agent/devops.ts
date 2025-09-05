// src/agents/devops.ts
import { Agent } from '@openai/agents';

// 推奨プロンプトプレフィックス（@openai/agents-core/extensionsから移行）
const RECOMMENDED_PROMPT_PREFIX = "You are a helpful assistant. Think step by step and be precise.";
import { DevOpsPlan } from './schemas.js';

export const devopsAgent = new Agent({
  name: 'DevOps/Release',
  instructions: `${RECOMMENDED_PROMPT_PREFIX}\nあなたはリリース担当です。Docker/CI/プレビューURL/ロールバック手順を提案してください。` ,
  outputType: DevOpsPlan,
});