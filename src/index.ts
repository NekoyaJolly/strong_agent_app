// src/index.ts（置き換え）
import 'dotenv/config';
import { startServer } from './runners/serverRunner.js';
import { run, setDefaultOpenAIKey } from '@openai/agents';
import { triageAgent } from './agent/triage.js';
import { loadOpenAIKeyFromSecrets } from './utils/env.js';

const MODE = process.env.RUN_MODE ?? (process.env.NODE_ENV === 'production' ? 'server' : 'cli');

if (MODE === 'server') {
  await startServer();
} else {
  loadOpenAIKeyFromSecrets();
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');
  setDefaultOpenAIKey(key); // Agents SDK の推奨初期化。:contentReference[oaicite:9]{index=9}
  const input = process.argv.slice(2).join(' ') || '稼働テスト';
  const result = await run(triageAgent, input, { maxTurns: 4 });
  console.log(result.finalOutput || 'No output');
}
