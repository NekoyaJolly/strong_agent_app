// src/agents/implementer.ts
import { Agent } from '@openai/agents';

// 推奨プロンプトプレフィックス（@openai/agents-core/extensionsから移行）
const RECOMMENDED_PROMPT_PREFIX = "You are a helpful assistant. Think step by step and be precise.";
import { ImplementationResult } from './schemas.js';

export const implementerAgent = new Agent({
  name: 'Implementer',
  instructions: `${RECOMMENDED_PROMPT_PREFIX}\nあなたは実装担当です。仕様に基づき最小で動くコードの追加/変更を提案し、生成されるファイル一覧と実行コマンドを提示してください。` ,
  outputType: ImplementationResult,
});