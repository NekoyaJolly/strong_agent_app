// src/run.ts
import 'dotenv/config';
import { run, setDefaultOpenAIKey } from '@openai/agents';
import { triageAgent } from './agent/agent.js';

if (process.env.OPENAI_API_KEY) setDefaultOpenAIKey(process.env.OPENAI_API_KEY);

const input = process.argv.slice(2).join(' ') || 'Next.js + PostgreSQL で簡易タスク管理アプリを作りたい。';
const result = await run(triageAgent, input, { maxTurns: 10 });

console.log('--- Final Output (text) ---------------------------');
console.log(result.finalOutput || 'No output');
console.log('\n--- Raw finalOutput (JSON, if any) ----------------');
console.log(JSON.stringify(result.finalOutput, null, 2));