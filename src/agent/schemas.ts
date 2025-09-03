// src/agents/schemas.ts
import { z } from 'zod';

// ===== 共通 =====
export const Task = z.object({ id: z.string(), title: z.string(), detail: z.string().optional(), estimateH: z.number().optional() });
export type Task = z.infer<typeof Task>;

export const HandoffNote = z.object({
  reason: z.string().describe('移譲理由（1行）'),
  context: z.string().describe('要約（200字以内）').optional(),
});
export type HandoffNote = z.infer<typeof HandoffNote>;

// ===== Architect 出力 =====
export const ArchitecturePlan = z.object({
  projectName: z.string(),
  stack: z.array(z.string()),
  services: z.array(z.string()).describe('主要サービス/サブシステム'),
  directories: z.array(z.string()).describe('推奨ディレクトリ構成'),
  envVars: z.array(z.string()).describe('必要な環境変数キー'),
  decisions: z.array(z.string()),
  risks: z.array(z.string()).default([]),
  initialBacklog: z.array(Task).default([]),
});
export type ArchitecturePlan = z.infer<typeof ArchitecturePlan>;

// ===== Implementer 出力 =====
export const ImplementationResult = z.object({
  summary: z.string(),
  createdFiles: z.array(z.string()).default([]),
  modifiedFiles: z.array(z.string()).default([]),
  commandsToRun: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
export type ImplementationResult = z.infer<typeof ImplementationResult>;

// ===== Reviewer 出力 =====
export const ReviewReport = z.object({
  summary: z.string(),
  issues: z.array(z.object({ kind: z.string(), path: z.string().optional(), message: z.string(), severity: z.enum(['info','warn','error']) })),
  score: z.number().min(0).max(100),
  actionItems: z.array(Task).default([]),
});
export type ReviewReport = z.infer<typeof ReviewReport>;

// ===== Test 出力 =====
export const TestReport = z.object({
  passed: z.number(), failed: z.number(),
  newTests: z.array(z.string()).default([]),
  coverageNote: z.string().optional(),
});
export type TestReport = z.infer<typeof TestReport>;

// ===== DevOps 出力 =====
export const DevOpsPlan = z.object({
  dockerized: z.boolean(),
  artifacts: z.array(z.string()).describe('生成物のパス').default([]),
  previewUrl: z.string().url().optional(),
  rollback: z.array(z.string()).default([]),
});
export type DevOpsPlan = z.infer<typeof DevOpsPlan>;

// ===== Docs 出力 =====
export const DocsUpdate = z.object({
  readmeUpdated: z.boolean().default(true),
  files: z.array(z.string()).default([]),
  changelogEntry: z.string(),
});
export type DocsUpdate = z.infer<typeof DocsUpdate>;

// ===== Research 出力 =====
export const ResearchResult = z.object({
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
export type ResearchResult = z.infer<typeof ResearchResult>;