// src/agents/triage.ts
import { Agent, handoff } from '@openai/agents';
import { removeAllTools, RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';
import { z } from 'zod';
import { architectAgent } from './architect.js';
import { implementerAgent } from './implementer.js';
import { reviewerAgent } from './reviewer.js';
import { testAgent } from './tester.js';
import { devopsAgent } from './devops.js';
import { docsAgent } from './docs.js';
import { noSecretsGuardrail } from './guardrails.js';

// ✅ スキーマと型を分離（同名NG）
const TriageNoteSchema = z.object({ memo: z.string().optional() });
export type TriageNote = z.infer<typeof TriageNoteSchema>;

// ✅ Agent.create はジェネリクス不要
export const triageAgent = Agent.create({
  name: 'Triage/PM',
  instructions: `${RECOMMENDED_PROMPT_PREFIX}
あなたは一次窓口です。以下の担当へ適切に移譲し、必要であれば自分で補足回答します。
- Architect: 技術選定/雛形
- Implementer: 実装
- Reviewer: レビュー
- Test: テスト
- DevOps: デプロイ
- Docs: ドキュメント`,
  inputGuardrails: [noSecretsGuardrail],
  handoffs: [
    handoff(architectAgent, {
      toolDescriptionOverride: '技術選定やディレクトリ構成、初期バックログが必要なときに使用',
      inputFilter: removeAllTools,
      // ✅ Zodスキーマを渡す
      inputType: TriageNoteSchema,
    }),
    handoff(implementerAgent, {
      toolDescriptionOverride: '具体的な実装/ファイル作成/コマンド提示が必要なときに使用',
      inputFilter: removeAllTools,
      inputType: TriageNoteSchema,
    }),
    handoff(reviewerAgent, {
      toolDescriptionOverride: 'レビュー/静的解析/指摘とスコアが必要なときに使用',
      inputFilter: removeAllTools,
      inputType: TriageNoteSchema,
    }),
    handoff(testAgent, {
      toolDescriptionOverride: 'テストケース提案/想定結果の要約が必要なときに使用',
      inputFilter: removeAllTools,
      inputType: TriageNoteSchema,
    }),
    handoff(devopsAgent, {
      toolDescriptionOverride: 'Docker/CI/プレビュー環境/ロールバック手順が必要なときに使用',
      inputFilter: removeAllTools,
      inputType: TriageNoteSchema,
    }),
    handoff(docsAgent, {
      toolDescriptionOverride: 'README/CHANGELOG/Runbookの更新が必要なときに使用',
      inputFilter: removeAllTools,
      inputType: TriageNoteSchema,
    }),
  ],
});
