// src/run.ts
import { run, setDefaultOpenAIKey } from '@openai/agents';
import { triageAgent } from './agent/triage.js';
import { getConfig } from './utils/config.js';

async function main() {
  try {
    // 統合設定システムから設定を読み込み
    const config = await getConfig();
    
    // OpenAI API キーを設定
    if (config.env.openaiApiKey) {
      setDefaultOpenAIKey(config.env.openaiApiKey);
    } else {
      console.error('OpenAI API key not found. Please set OPENAI_API_KEY environment variable or in config file.');
      process.exit(1);
    }

    const input = process.argv.slice(2).join(' ') || 'Next.js + PostgreSQL で簡易タスク管理アプリを作りたい。';
    const result = await run(triageAgent, input, { 
      maxTurns: config.env.maxTurns 
    });

    console.log('--- Final Output (text) ---------------------------');
    console.log(result.finalOutput || 'No output');
    console.log('\n--- Raw finalOutput (JSON, if any) ----------------');
    console.log(JSON.stringify(result.finalOutput, null, 2));
  } catch (error) {
    console.error('Application failed to start:', error);
    process.exit(1);
  }
}

main();