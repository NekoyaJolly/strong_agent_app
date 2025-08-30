// src/agents/reviewer.ts
import { Agent } from '@openai/agents';
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';
import { ReviewReport } from './schemas.js';

export const reviewerAgent = new Agent({
  name: 'Reviewer/Static-Analysis',
  instructions: `${RECOMMENDED_PROMPT_PREFIX}\nあなたはコードレビュー担当です。設計逸脱、危険API、型不整合、循環依存などを指摘し、100点満点で採点します。` ,
  outputType: ReviewReport,
});