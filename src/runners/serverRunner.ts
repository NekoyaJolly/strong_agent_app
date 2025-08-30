/**
 * Hardened server for production use.
 * - Strict CORS allowlist (from env CORS_ORIGINS)
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
import { loadOpenAIKeyFromSecrets } from '../utils/env.js';

if (process.env.OPENAI_API_KEY) setDefaultOpenAIKey(process.env.OPENAI_API_KEY);

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const JSON_LIMIT = process.env.JSON_LIMIT ?? '256kb';
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX ?? 60);
const MAX_TURNS_DEFAULT = Number(process.env.MAX_TURNS ?? 8);

const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, allowedOrigins.includes(origin));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  maxAge: 600,
};

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

const ChatRequest = z.object({
  input: z.string().min(1).max(1000),
  maxTurns: z.number().int().min(1).max(20).optional(),
});

export async function startServer(port = Number(process.env.PORT ?? 3000)) {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cors(corsOptions));
  app.use(express.json({ limit: JSON_LIMIT }));
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
        maxTurns: maxTurns ?? MAX_TURNS_DEFAULT,
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

  app.listen(port, () => {
    logger.info({ port, allowedOrigins }, 'server-started');
  });
}
