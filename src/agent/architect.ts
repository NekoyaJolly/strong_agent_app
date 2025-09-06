// src/agents/architect.ts
import { Agent } from '@openai/agents';
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';
import { ArchitecturePlan } from './schemas.js';

export const architectAgent = new Agent({
  name: 'Architect/Scaffold',
  instructions: `${RECOMMENDED_PROMPT_PREFIX}\nあなたはアプリケーションのアーキテクトです。要求を要約し、技術選定、モジュール分割、ディレクトリ構成、必要な環境変数、初期バックログを日本語で出力してください。` ,
  outputType: ArchitecturePlan,
});