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

  // 🔒 Environment-based security configuration
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  // OpenAI API キーを設定
  if (config.env.openaiApiKey) {
    setDefaultOpenAIKey(config.env.openaiApiKey);
  }

  const logger = pino({ level: config.env.logLevel });
  
  // 🔒 CORS設定の厳格化 - セキュリティ強化
  // 動的オリジン検証による本番環境セキュリティ
  const corsOriginsString = Array.isArray(config.server.cors.origins) 
    ? config.server.cors.origins.join(',') 
    : (config.server.cors.origins ?? '');
    
  const allowedOrigins = new Set(corsOriginsString
    .split(',')
    .map((origin: string) => origin.trim())
    .filter(Boolean)
  );

  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // オリジンなしのリクエスト (curl, モバイルアプリ等) を許可
      if (!origin) {
        return callback(null, true);
      }

      try {
        // URLオブジェクトでオリジンを正規化・検証
        const normalizedOrigin = new URL(origin).origin;
        const isAllowed = allowedOrigins.has(normalizedOrigin);
        
        if (isAllowed) {
          callback(null, true);
        } else {
          // セキュリティログ出力
          logger.warn(`CORS violation: Unauthorized origin attempted access: ${normalizedOrigin}`);
          callback(new Error('CORS: Origin not allowed'), false);
        }
      } catch (error) {
        // 不正なURL形式のオリジンを拒否
        logger.warn(`CORS violation: Invalid origin format: ${origin}`);
        callback(new Error('CORS: Invalid origin format'), false);
      }
    },
    credentials: true, // 認証情報を含むリクエストを許可
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    methods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 600, // プリフライトキャッシュ時間
    // レガシーブラウザ対応
    optionsSuccessStatus: 200
  };

  // 🔒 Enhanced Rate Limiting v8 - 本番セキュリティ強化
  // 🚀 Rate Limit v8: draft-8ヘッダサポート、エンドポイント別制限
  
  // グローバルレート制限 (全エンドポイント)
  const globalLimiter = rateLimit({
    windowMs: config.env.rateLimitWindowMs,
    max: config.env.rateLimitMax,
    standardHeaders: 'draft-8', // ✨ v8新機能: IETF RateLimit headerサポート
    legacyHeaders: false,
    identifier: 'global-api', // draft-8 quota policy identifier
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(config.env.rateLimitWindowMs / 1000)
    },
    // カスタムキー生成 (IP + User-Agent でより厳密に)
    keyGenerator: (req) => {
      return `${req.ip}_${req.get('User-Agent') || 'unknown'}`;
    },
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  });

  // 🛡️ API エンドポイント専用の厳格制限
  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1分間
    max: config.env.nodeEnv === 'production' ? 30 : 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    identifier: 'api-endpoints', // API専用識別子
    message: {
      error: 'API rate limit exceeded',
      retryAfter: 60
    },
    keyGenerator: (req) => {
      return `api_${req.ip}_${req.path}`;
    },
    handler: (req, res) => {
      logger.warn(`API rate limit exceeded for ${req.ip} on ${req.path}`);
      res.status(429).json({
        error: 'Too many API requests',
        message: 'Please wait before making more requests',
        retryAfter: 60,
        path: req.path
      });
    }
  });

  // 🔥 認証エンドポイント用の最も厳格な制限
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分間
    max: isProduction ? 5 : 20, // 本番: 5回, 開発: 20回
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    identifier: 'authentication', // 認証専用識別子
    message: {
      error: 'Too many authentication requests. Please wait before retrying.',
      type: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: 900 // 15分
    },
    keyGenerator: (req) => {
      return `auth_${req.ip}`;
    },
    handler: (req, res) => {
      logger.warn(`Authentication rate limit exceeded for ${req.ip}`);
      res.status(429).json({
        error: 'Too many authentication attempts',
        message: 'Please wait 15 minutes before trying again',
        retryAfter: 900
      });
    }
  });

  const ChatRequest = z.object({
    input: z.string().min(1).max(1000),
    maxTurns: z.number().int().min(1).max(20).optional(),
  });

  const app = express();

  // 🔒 Production Security Configuration
  // Enhanced Helmet configuration for production
  app.use(
    helmet({
      // Content Security Policy - 本番では厳格、開発では緩和
      contentSecurityPolicy: isProduction ? {
        directives: {
          defaultSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // CSS-in-JSライブラリ対応
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https:"], // API通信用
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: [],
        },
      } : false, // 開発環境では無効化

      // Cross-Origin policies
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { 
        policy: isProduction ? 'same-site' : 'cross-origin' 
      },
      crossOriginEmbedderPolicy: false, // API サーバーなので無効

      // Referrer policy
      referrerPolicy: { policy: 'no-referrer' },

      // HTTP Strict Transport Security (HTTPS強制)
      hsts: isProduction ? {
        maxAge: 15552000, // 180日
        includeSubDomains: true,
        preload: true
      } : false, // 開発環境では無効

      // X-Frame-Options (Clickjacking防止)
      frameguard: { action: 'deny' },

      // X-Content-Type-Options (MIME sniffing防止)
      noSniff: true,

      // X-DNS-Prefetch-Control
      dnsPrefetchControl: { allow: false },

      // X-Download-Options (IE用)
      ieNoOpen: true,

      // X-Permitted-Cross-Domain-Policies
      permittedCrossDomainPolicies: false,
    }),
  );

  // セキュリティヘッダーの追加設定
  if (isProduction) {
    // X-Powered-By ヘッダーを削除 (fingerprinting対策)
    app.disable('x-powered-by');
    
    // 追加のセキュリティヘッダー
    app.use((req, res, next) => {
      // Expect-CT ヘッダー (Certificate Transparency)
      res.setHeader('Expect-CT', 'max-age=86400, enforce');
      
      // Feature-Policy / Permissions-Policy
      res.setHeader('Permissions-Policy', 
        'camera=(), microphone=(), geolocation=(), payment=()'
      );
      
      // Server情報の隠蔽
      res.removeHeader('Server');
      
      next();
    });
  }
  app.use(cors(corsOptions));
  app.use(express.json({ limit: config.env.jsonLimit }));
  app.use(globalLimiter); // v8対応グローバルレート制限

  // セキュリティエラーハンドリング
  const securityErrorHandler = (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error(`Security error: ${err.message}`);

    // セキュリティエラーの詳細を本番環境では隠蔽
    const message = config.env.nodeEnv === 'production' 
      ? 'Internal server error' 
      : err.message;

    res.status(500).json({
      error: message,
      timestamp: new Date().toISOString()
    });
  };

  app.use(
    pinoHttp.default({
      logger,
      genReqId: (req: any) =>
        String(req.headers['x-request-id'] ?? crypto.randomUUID()),
      // 🔒 ログリダクション - 機密情報の自動削除
      redact: {
        paths: [
          // リクエストヘッダーの機密情報
          'req.headers.authorization',
          'req.headers["x-api-key"]',
          'req.headers.cookie',
          'req.headers["x-auth-token"]',
          // レスポンスヘッダーの機密情報
          'res.headers["set-cookie"]',
          'res.headers["x-auth-token"]',
          // リクエストボディの機密情報
          'req.body.password',
          'req.body.apiKey',
          'req.body.token',
          'req.body.secret',
          'req.body.authToken',
          // ネストされた機密データ
          'req.body.user.password',
          'req.body.credentials.password',
          'req.body.auth.token'
        ],
        remove: true // 機密情報を完全に削除（マスクではなく）
      }
    }),
  );

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

  // API エンドポイントに厳格なレート制限を適用
  app.post('/chat', apiLimiter, async (req, res) => {
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

  // セキュリティエラーハンドラーを最後に追加
  app.use(securityErrorHandler);

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
