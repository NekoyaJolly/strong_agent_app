// src/agents/tester.ts
import { Agent } from '@openai/agents';
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';
import { TestReport } from './schemas.js';

export const testAgent = new Agent({
  name: 'Test',
  instructions: `${RECOMMENDED_PROMPT_PREFIX}\nあなたはテスト担当です。ユニット/統合テストの候補を提示し、仮実行の結果（想定）をまとめます。` ,
  outputType: TestReport,
});