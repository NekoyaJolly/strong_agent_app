// src/runners/serverRunner.ts（新規）
import express from 'express';
import cors from 'cors';
import { run } from '@openai/agents';
import { setDefaultOpenAIKey } from '@openai/agents-openai';
import { triageAgent } from '../agent/triage.js';
import { loadOpenAIKeyFromSecrets } from '../utils/env.js';

export async function startServer() {
  loadOpenAIKeyFromSecrets();
  const key = process.env.OPENAI_API_KEY;
  if (!key) { console.error('OPENAI_API_KEY not set'); process.exit(1); }
  setDefaultOpenAIKey(key);

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.post('/chat', async (req, res) => {
    const input = String(req.body?.input ?? '');
    if (!input) return res.status(400).json({ error: 'input required' });
    const result = await run(triageAgent, input, { maxTurns: 8 });
    res.json({ text: result.finalOutput || 'No output', finalOutput: result.finalOutput });
  });

  const port = Number(process.env.PORT ?? 3000);
  const server = app.listen(port, () => console.log(`server on ${port}`));

  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 8000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
