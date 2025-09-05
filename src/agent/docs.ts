// src/agents/docs.ts
import { Agent } from '@openai/agents';

// 推奨プロンプトプレフィックス（@openai/agents-core/extensionsから移行）
const RECOMMENDED_PROMPT_PREFIX = "You are a helpful assistant. Think step by step and be precise.";
import { DocsUpdate } from './schemas.js';

export const docsAgent = new Agent({
  name: 'Docs/Comms',
  instructions: `${RECOMMENDED_PROMPT_PREFIX}\nあなたはドキュメント担当です。README/CHANGELOG/セットアップ手順の差分をまとめてください。` ,
  outputType: DocsUpdate,
});