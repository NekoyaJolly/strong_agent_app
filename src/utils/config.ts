import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// エージェントモデル設定のスキーマ
export const ModelConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'local']).default('openai'),
  model: z.string().default('gpt-4'),
  temperature: z.number().min(0).max(2).default(0.7),
});

// ツール設定のスキーマ
export const ToolConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxFileSize: z.number().positive().default(1048576).optional(),
  requireApproval: z.boolean().default(true).optional(),
  allowedCommands: z.array(z.string()).optional(),
  allowedEnvironments: z.array(z.enum(['development', 'staging', 'production'])).optional(),
  maxResults: z.number().positive().default(10).optional(),
  sandboxMode: z.boolean().default(true).optional(),
  allowedLanguages: z.array(z.string()).default(['javascript', 'typescript']).optional(),
});

// ガードレール設定のスキーマ
export const GuardrailsConfigSchema = z.object({
  level: z.enum(['strict', 'moderate', 'permissive']).default('moderate'),
  approvalRequired: z.object({
    fileOperations: z.boolean().default(true),
    deployments: z.boolean().default(true),
    systemCommands: z.boolean().default(true),
  }).default({}),
  blockedOperations: z.array(z.string()).default([
    'format',
    'rm -rf',
    'dd if=',
    'sudo'
  ]),
});

// サーバー設定のスキーマ
export const ServerConfigSchema = z.object({
  enabled: z.boolean().default(false),
  port: z.number().min(1).max(65535).default(3000),
  cors: z.object({
    enabled: z.boolean().default(true),
    origins: z.array(z.string()).default(['http://localhost:3000']),
  }).default({}),
});

// メイン設定スキーマ
export const ConfigSchema = z.object({
  agent: z.object({
    name: z.string().default('StrongAgent'),
    version: z.string().default('1.0.0'),
    model: ModelConfigSchema,
  }).default(() => ({
    name: 'StrongAgent',
    version: '1.0.0',
    model: {
      provider: 'openai' as const,
      model: 'gpt-4',
      temperature: 0.7
    }
  })),
  tools: z.object({
    readFile: ToolConfigSchema.optional(),
    writeFile: ToolConfigSchema.optional(),
    gitTool: ToolConfigSchema.optional(),
    deployTool: ToolConfigSchema.optional(),
    webSearch: ToolConfigSchema.optional(),
    codeInterpreter: ToolConfigSchema.optional(),
  }).default({}),
  guardrails: GuardrailsConfigSchema.default(() => ({
    level: 'moderate' as const,
    approvalRequired: {
      fileOperations: true,
      deployments: true,
      systemCommands: true,
    },
    blockedOperations: [
      'format',
      'rm -rf',
      'dd if=',
      'sudo'
    ]
  })),
  integrations: z.object({
    vectorStore: z.object({
      enabled: z.boolean().default(false),
      provider: z.enum(['local', 'pinecone', 'openai']).default('local'),
    }).default(() => ({ enabled: false, provider: 'local' as const })),
  }).default(() => ({
    vectorStore: { enabled: false, provider: 'local' as const }
  })),
  server: ServerConfigSchema.default(() => ({
    enabled: false,
    port: 3000,
    cors: {
      enabled: true,
      origins: ['http://localhost:3000']
    }
  })),
  // 環境変数から読み込まれる設定
  env: z.object({
    openaiApiKey: z.string().optional(),
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    nodeEnv: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    corsOrigins: z.string().optional(),
    rateLimitWindowMs: z.number().positive().default(60000),
    rateLimitMax: z.number().positive().default(60),
    maxTurns: z.number().positive().default(8),
    jsonLimit: z.string().default('256kb'),
  }).default(() => ({
    logLevel: 'info' as const,
    nodeEnv: 'development' as const,
    rateLimitWindowMs: 60000,
    rateLimitMax: 60,
    maxTurns: 8,
    jsonLimit: '256kb'
  })),
});

export type Config = z.infer<typeof ConfigSchema>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type ToolConfig = z.infer<typeof ToolConfigSchema>;
export type GuardrailsConfig = z.infer<typeof GuardrailsConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;

// JSONファイルから読み込まれる未知の設定オブジェクト型
type UnknownConfigObject = Record<string, unknown>;

/**
 * 統合設定管理クラス
 * 1. agent.config.jsonをベース設定として読み込み
 * 2. 環境変数で上書き可能
 * 3. Zodスキーマで検証
 */
class ConfigManager {
  private static instance: ConfigManager;
  private config: Config | null = null;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {
    // Singleton pattern - empty constructor is intentional
  }

  public static getInstance(): ConfigManager {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 設定を読み込み、検証して返す
   */
  public loadConfig(projectName?: string): Config {
    if (this.config) {
      return this.config;
    }

    // 1. 環境変数を読み込み
    this.loadEnvVars(projectName);

    // 2. JSONファイルから基本設定を読み込み
    const jsonConfig = this.loadJsonConfig();

    // 3. 環境変数で設定を上書き
    const envOverrides = this.getEnvOverrides();

    // 4. 設定をマージ
    const rawConfig = this.mergeConfigs(jsonConfig, envOverrides);

    // 5. Zodスキーマで検証
    try {
      this.config = ConfigSchema.parse(rawConfig);
      return this.config;
    } catch (error) {
      console.error('Configuration validation failed:', error);
      throw new Error(`Invalid configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 環境変数を読み込む
   */
  private loadEnvVars(projectName?: string): void {
    const base = process.cwd();
    
    // プロジェクト固有の.envファイルを読み込み
    if (projectName) {
      const projectEnvPath = path.join(base, 'projects', projectName, '.env');
      const projectAgentEnvPath = path.join(base, 'projects', projectName, '.env.agent');
      
      if (fs.existsSync(projectAgentEnvPath)) {
        dotenv.config({ path: projectAgentEnvPath });
      }
      if (fs.existsSync(projectEnvPath)) {
        dotenv.config({ path: projectEnvPath });
      }
    }

    // ルート.envファイルをフォールバックとして読み込み
    const rootEnvPath = path.join(base, '.env');
    if (fs.existsSync(rootEnvPath)) {
      dotenv.config({ path: rootEnvPath });
    }

    // Docker secretsからOpenAI APIキーを読み込み
    this.loadOpenAIKeyFromSecrets();
  }

  /**
   * JSONファイルから基本設定を読み込む
   */
  private loadJsonConfig(): UnknownConfigObject {
    const configPath = path.join(process.cwd(), 'config', 'agent.config.json');
    
    if (!fs.existsSync(configPath)) {
      console.warn(`Config file not found at ${configPath}, using default values`);
      return {};
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const parsed: unknown = JSON.parse(configContent);
      // JSON.parseは any を返すが、ここでは unknown として扱い、型変換
      return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) 
        ? parsed as UnknownConfigObject 
        : {};
    } catch (error) {
      console.error(`Failed to parse config file: ${String(error)}`);
      throw new Error(`Invalid JSON in config file: ${configPath}`);
    }
  }

  /**
   * 環境変数から設定の上書き値を取得
   */
  private getEnvOverrides(): UnknownConfigObject {
    return {
      agent: {
        model: {
          provider: process.env.MODEL_PROVIDER,
          model: process.env.MODEL_NAME,
          temperature: process.env.MODEL_TEMPERATURE ? parseFloat(process.env.MODEL_TEMPERATURE) : undefined,
        },
      },
      server: {
        enabled: process.env.SERVER_ENABLED ? process.env.SERVER_ENABLED === 'true' : undefined,
        port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
        cors: {
          enabled: process.env.CORS_ENABLED ? process.env.CORS_ENABLED === 'true' : undefined,
          origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()) : undefined,
        },
      },
      env: {
        openaiApiKey: process.env.OPENAI_API_KEY,
        logLevel: process.env.LOG_LEVEL,
        nodeEnv: process.env.NODE_ENV,
        corsOrigins: process.env.CORS_ORIGINS,
        rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) : undefined,
        rateLimitMax: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : undefined,
        maxTurns: process.env.MAX_TURNS ? parseInt(process.env.MAX_TURNS, 10) : undefined,
        jsonLimit: process.env.JSON_LIMIT,
      },
    };
  }

  /**
   * 設定をマージする（環境変数が優先）
   */
  private mergeConfigs(jsonConfig: UnknownConfigObject, envOverrides: UnknownConfigObject): UnknownConfigObject {
    return this.deepMerge(jsonConfig, envOverrides);
  }

  /**
   * オブジェクトの深いマージ（undefinedは無視）
   */
  private deepMerge(target: UnknownConfigObject, source: UnknownConfigObject): UnknownConfigObject {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!source || typeof source !== 'object') return target;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!target || typeof target !== 'object') return source;

    const result = { ...target };

    for (const key in source) {
      if (source[key] !== undefined) {
        if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
          // 型ガード: unknown をオブジェクトとして安全に扱う
          const sourceValue = source[key] as UnknownConfigObject;
          const targetValue = (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key]))
            ? result[key] as UnknownConfigObject
            : {};
          result[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * Docker secretsからOpenAI APIキーを読み込む
   */
  private loadOpenAIKeyFromSecrets(): void {
    const secretPath = process.env.OPENAI_API_KEY_FILE ?? '/run/secrets/openai_api_key';
    if (fs.existsSync(secretPath)) {
      try {
        const key = fs.readFileSync(secretPath, 'utf8').trim();
        if (key && !process.env.OPENAI_API_KEY) {
          process.env.OPENAI_API_KEY = key;
        }
      } catch (error) {
        console.warn(`Failed to read OpenAI API key from secrets: ${String(error)}`);
      }
    }
  }

  /**
   * 現在の設定を取得（キャッシュされた値）
   */
  public getConfig(): Config {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * 設定をリロード（テスト用）
   */
  public reset(): void {
    this.config = null;
  }
}

// シングルトンインスタンスをエクスポート
export const configManager = ConfigManager.getInstance();

/**
 * 便利関数：設定を読み込んで取得
 */
export function getConfig(projectName?: string): Config {
  return configManager.loadConfig(projectName);
}

/**
 * 便利関数：現在の設定を取得（既に読み込み済みの場合）
 */
export function getCurrentConfig(): Config {
  return configManager.getConfig();
}
