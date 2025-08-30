// src/agents/docs.ts
import { Agent } from '@openai/agents';
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';
import { DocsUpdate } from './schemas.js';

export const docsAgent = new Agent({
  name: 'Docs/Comms',
  instructions: `${RECOMMENDED_PROMPT_PREFIX}\nあなたはドキュメント担当です。README/CHANGELOG/セットアップ手順の差分をまとめてください。` ,
  outputType: DocsUpdate,
});