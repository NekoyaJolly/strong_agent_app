// src/agents/architect.ts
import { Agent } from '@openai/agents';
import { ArchitecturePlan } from './schemas.js';

// 推奨プロンプトプレフィックス（@openai/agents-core/extensionsから移行）
const RECOMMENDED_PROMPT_PREFIX = "You are a helpful assistant. Think step by step and be precise.";

export const architectAgent = new Agent({
  name: 'Architect/Scaffold',
  instructions: `${RECOMMENDED_PROMPT_PREFIX}\nあなたはアプリケーションのアーキテクトです。要求を要約し、技術選定、モジュール分割、ディレクトリ構成、必要な環境変数、初期バックログを日本語で出力してください。` ,
  outputType: ArchitecturePlan,
});