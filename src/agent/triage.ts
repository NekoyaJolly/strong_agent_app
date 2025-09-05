import { Agent, handoff, webSearchTool } from '@openai/agents';
import { z } from 'zod';

// 推奨プロンプトプレフィックス（@openai/agents-core/extensionsから移行）
const RECOMMENDED_PROMPT_PREFIX = "You are a helpful assistant. Think step by step and be precise.";

// ツール除去フィルター（@openai/agents-core/extensionsのremoveAllToolsから移行）
const removeAllTools = (data: any) => ({
  ...data,
  newItems: data.newItems.filter((item: any) => item.type !== 'tool_call')
});
import { architectAgent } from './architect.js';
import { researcherAgent } from './researcher.js';
import { implementerAgent } from './implementer.js';
import { reviewerAgent } from './reviewer.js';
import { testAgent } from './tester.js';
import { devopsAgent } from './devops.js';
import { docsAgent } from './docs.js';
import { noSecretsGuardrail, compactJsonGuardrail } from './guardrails.js';
import { readFile } from './tools/readFile.js';
import { writeFileSafe } from './tools/writeFile.js';

const TriageNoteSchema = z.object({ memo: z.string().optional() });
export type TriageNote = z.infer<typeof TriageNoteSchema>;

export const triageAgent = Agent.create({
  name: 'Triage',
  instructions: [
    RECOMMENDED_PROMPT_PREFIX,
    'You triage requests, summarize goals, and hand off to specialists as needed.',
    'When tools are required, prefer webSearch first, read_file next, and write_file_safe only with explicit user consent.',
  ].join('\n'),
  tools: [
    webSearchTool(),
    readFile,
    writeFileSafe,
  ],
  inputGuardrails: [noSecretsGuardrail],
  outputGuardrails: [compactJsonGuardrail],
  handoffs: [
    handoff(researcherAgent, { inputFilter: removeAllTools, inputType: TriageNoteSchema }),
    handoff(architectAgent, { inputFilter: removeAllTools, inputType: TriageNoteSchema }),
    handoff(implementerAgent, { inputFilter: removeAllTools, inputType: TriageNoteSchema }),
    handoff(reviewerAgent, { inputFilter: removeAllTools, inputType: TriageNoteSchema }),
    handoff(testAgent, { inputFilter: removeAllTools, inputType: TriageNoteSchema }),
    handoff(devopsAgent, { inputFilter: removeAllTools, inputType: TriageNoteSchema }),
    handoff(docsAgent, { inputFilter: removeAllTools, inputType: TriageNoteSchema }),
  ],
});
