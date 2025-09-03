// src/agent/researcher.ts
import { Agent, webSearchTool } from '@openai/agents';
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';
import { z } from 'zod';

export const ResearchResultSchema = z.object({
  summary: z.string().describe('リサーチ結果の要約'),
  findings: z.array(z.object({
    topic: z.string(),
    information: z.string(),
    sources: z.array(z.string()).optional(),
    relevanceScore: z.number().min(0).max(10)
  })),
  recommendations: z.array(z.string()).describe('推奨事項'),
  technicalConsiderations: z.array(z.string()).describe('技術的考慮事項'),
  potentialChallenges: z.array(z.string()).describe('想定される課題'),
  marketAnalysis: z.string().optional().describe('市場分析（該当する場合）'),
  bestPractices: z.array(z.string()).describe('ベストプラクティス'),
  references: z.array(z.object({
    title: z.string(),
    url: z.string().url(),
    summary: z.string()
  })).default([])
});

export type ResearchResult = z.infer<typeof ResearchResultSchema>;

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
  outputType: ResearchResultSchema
});
