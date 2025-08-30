import { Agent, run, tool, setDefaultOpenAIKey /*, webSearchTool*/ } from '@openai/agents';
import { z } from 'zod';

// 起動時に環境変数からキーを設定
if (process.env.OPENAI_API_KEY) {
  setDefaultOpenAIKey(process.env.OPENAI_API_KEY);
}

// サンプルの自前ツール（依存レスで確実に動作）
const getTime = tool({
  name: 'get_time',
  description: '現在のISO時刻を返す',
  parameters: z.object({}),
  execute: async () => new Date().toISOString(),
});

// 必要に応じて web 検索ツールを有効化（権限/課金確認の上で）
// const search = webSearchTool({ /* オプションがあれば設定 */ });

export const triageAgent = new Agent({
  name: 'Triage Agent',
  instructions: [
    'You are a concise, helpful assistant.',
    'Prioritize correctness and clarity.',
    // GPT-5の「積極性」やツール前口上はCookbookの推奨に沿って設計可能
    // 例: ツール実行前に短い計画を述べ、完了後に要約を返す 等
  ].join('\n'),
  // tools: [getTime, search], // 初期は安定動作を優先して getTime のみ
  tools: [getTime],
});

// シンプルな実行関数（最終出力を返す）
export async function runAgent(input: string) {
  const result = await run(triageAgent, input);
  return {
    finalOutput: result.finalOutput, // 最終テキスト等
    agentName: triageAgent.name,     // エージェント名
    result: result,                  // 全体の結果
  };
}
