// src/agents/researcher.ts
import { Agent, webSearchTool } from '@openai/agents';
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';
import { ResearchResult } from './schemas.js';

export const researcherAgent = new Agent({
  name: 'Researcher',
  instructions: [
    RECOMMENDED_PROMPT_PREFIX,
    'あなたは優秀なリサーチャーです。',
    '与えられた要求に対して、以下の観点から徹底的な調査を行います：',
    '1. 技術的実現可能性の調査',
    '2. 既存ソリューションの調査',
    '3. ベストプラクティスの調査', 
    '4. 潜在的なリスクと課題の特定',
    '5. 市場動向と競合調査（該当する場合）',
    '',
    'Webサーチを積極的に活用し、最新の情報を収集してください。',
    '調査結果は構造化された形式で出力し、後続のArchitectエージェントが活用できるようにしてください。'
  ].join('\n'),
  tools: [webSearchTool()],
  outputType: ResearchResult
});
