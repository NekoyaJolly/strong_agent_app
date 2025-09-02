/**
 * Hardened server for production use.
 * - Configuration managed by unified config system
 * - Strict CORS allowlist
 * - Helmet security headers  
 * - Rate limiting
 * - JSON size limits
 * - Structured logs with pino
 * - Zod validation and guardrail error mapping
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp, { HttpLogger } from 'pino-http';
import crypto from 'node:crypto';
import { z } from 'zod';
import { run, setDefaultOpenAIKey } from '@openai/agents';
import { triageAgent } from '../agent/triage.js';
import { getConfig } from '../utils/config.js';

export async function createServer() {
  // 統合設定システムから設定を読み込み
  const config = await getConfig();

  // OpenAI API キーを設定
  if (config.env.openaiApiKey) {
    setDefaultOpenAIKey(config.env.openaiApiKey);
  }

  const logger = pino({ level: config.env.logLevel });
  
  // CORS設定
  const allowedOrigins = config.server.cors.origins;
  const corsOptions: cors.CorsOptions = {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      return callback(null, allowedOrigins.includes(origin));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 600,
  };

  // レート制限設定
  const limiter = rateLimit({
    windowMs: config.env.rateLimitWindowMs,
    max: config.env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const ChatRequest = z.object({
    input: z.string().min(1).max(1000),
    maxTurns: z.number().int().min(1).max(20).optional(),
  });

  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cors(corsOptions));
  app.use(express.json({ limit: config.env.jsonLimit }));
  app.use(limiter);
  app.use(
    pinoHttp.default({
      logger,
      genReqId: (req: any) =>
        String(req.headers['x-request-id'] ?? crypto.randomUUID()),
    }),
  );

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

  app.post('/chat', async (req, res) => {
    const parsed = ChatRequest.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
    }

    try {
      const { input, maxTurns } = parsed.data;
      const result = await run(triageAgent, input, {
        maxTurns: maxTurns ?? config.env.maxTurns,
      });
      return res.status(200).json({ finalOutput: result.finalOutput });
    } catch (err: any) {
      const name = err?.name ?? 'Error';
      if (name === 'InputGuardrailTripwireTriggered') {
        return res.status(422).json({ error: 'input_guardrail', message: String(err?.message ?? 'blocked') });
      }
      if (name === 'OutputGuardrailTripwireTriggered') {
        return res.status(422).json({ error: 'output_guardrail', message: String(err?.message ?? 'blocked') });
      }
      return res.status(500).json({ error: 'internal_error', message: String(err?.message ?? err) });
    }
  });

  return app;
}

export async function startServer(port?: number) {
  const config = await getConfig();
  const app = await createServer();
  const serverPort = port || config.server.port;

  app.listen(serverPort, () => {
    const logger = pino({ level: config.env.logLevel });
    logger.info({ port: serverPort, allowedOrigins: config.server.cors.origins }, 'server-started');
  });
}
