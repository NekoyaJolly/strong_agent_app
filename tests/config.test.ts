import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ConfigSchema, configManager, getConfig } from '../src/utils/config.js';

describe('Config Management', () => {
  const testConfigDir = path.join(process.cwd(), 'test-config');
  const testConfigFile = path.join(testConfigDir, 'agent.config.json');

  beforeEach(() => {
    // 各テストの前にConfigManagerをリセット
    configManager.reset();
    
    // テストディレクトリを作成
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }
    
    // 環境変数をクリア（すべての設定関連の環境変数）
    delete process.env.MODEL_PROVIDER;
    delete process.env.MODEL_NAME;
    delete process.env.MODEL_TEMPERATURE;
    delete process.env.OPENAI_API_KEY;
    delete process.env.LOG_LEVEL;
    delete process.env.CORS_ORIGINS;
    delete process.env.PORT;
    delete process.env.SERVER_ENABLED;
    delete process.env.CORS_ENABLED;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.MAX_TURNS;
    delete process.env.JSON_LIMIT;
    
    // NODE_ENVをテスト用に設定
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    // 各テストの後もConfigManagerをリセット
    configManager.reset();
    
    // 環境変数もクリーンアップ
    delete process.env.MODEL_PROVIDER;
    delete process.env.MODEL_NAME;
    delete process.env.MODEL_TEMPERATURE;
    delete process.env.OPENAI_API_KEY;
    delete process.env.LOG_LEVEL;
    delete process.env.CORS_ORIGINS;
    delete process.env.PORT;
    delete process.env.SERVER_ENABLED;
    delete process.env.CORS_ENABLED;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.MAX_TURNS;
    delete process.env.JSON_LIMIT;
    
    // テストファイルをクリーンアップ
    if (fs.existsSync(testConfigFile)) {
      fs.unlinkSync(testConfigFile);
    }
    if (fs.existsSync(testConfigDir)) {
      try {
        // 再帰的にディレクトリを削除
        fs.rmSync(testConfigDir, { recursive: true, force: true });
      } catch {
        // クリーンアップエラーは無視
      }
    }
  });

  it('should load default configuration when no config file exists', () => {
    const config = getConfig();
    
    expect(config.agent.name).toBe('StrongAgent');
    expect(config.agent.version).toBe('1.0.0');
    expect(config.agent.model.provider).toBe('openai');
    expect(config.agent.model.model).toBe('gpt-4');
    expect(config.agent.model.temperature).toBe(0.7);
    expect(config.env.logLevel).toBe('info');
  });

  it('should validate configuration against schema', () => {
    const validConfig = {
      agent: {
        name: 'TestAgent',
        version: '1.0.0',
        model: {
          provider: 'openai',
          model: 'gpt-4',
          temperature: 0.8
        }
      },
      tools: {},
      guardrails: {
        level: 'moderate',
        approvalRequired: {},
        blockedOperations: []
      },
      integrations: {},
      server: {
        enabled: false,
        port: 3000,
        cors: {
          enabled: true,
          origins: ['http://localhost:3000']
        }
      },
      env: {}
    };

    const result = ConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('should reject invalid configuration', () => {
    const invalidConfig = {
      agent: {
        name: 'TestAgent',
        version: '1.0.0',
        model: {
          provider: 'invalid-provider', // 無効なプロバイダー
          model: 'gpt-4'
        }
      }
    };

    const result = ConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  it('should override config with environment variables', () => {
    // 環境変数を設定
    process.env.MODEL_PROVIDER = 'anthropic';
    process.env.MODEL_NAME = 'claude-3';
    process.env.MODEL_TEMPERATURE = '0.5';
    process.env.OPENAI_API_KEY = 'test-api-key';
    process.env.LOG_LEVEL = 'debug';

    const config = getConfig();
    
    expect(config.agent.model.provider).toBe('anthropic');
    expect(config.agent.model.model).toBe('claude-3');
    expect(config.agent.model.temperature).toBe(0.5);
    expect(config.env.openaiApiKey).toBe('test-api-key');
    expect(config.env.logLevel).toBe('debug');
  });

  it('should handle JSON config file correctly', () => {
    // テスト用のconfig.jsonを作成
    const testConfig = {
      agent: {
        name: 'CustomAgent',
        version: '2.0.0',
        model: {
          provider: 'anthropic',
          model: 'claude-3',
          temperature: 0.9
        }
      },
      guardrails: {
        level: 'strict'
      },
      server: {
        port: 4000
      }
    };

    // 一時的にconfig ディレクトリを作成し設定ファイルを配置
    const tempConfigDir = path.join(testConfigDir, 'config');
    const tempConfigFile = path.join(tempConfigDir, 'agent.config.json');
    
    fs.mkdirSync(tempConfigDir, { recursive: true });
    fs.writeFileSync(tempConfigFile, JSON.stringify(testConfig, null, 2));
    
    // 一時的にprocess.cwdを変更
    const originalCwd = process.cwd.bind(process);
    process.cwd = () => testConfigDir;
    
    try {
      const config = getConfig();
      
      expect(config.agent.name).toBe('CustomAgent');
      expect(config.agent.version).toBe('2.0.0');
      expect(config.agent.model.provider).toBe('anthropic');
      expect(config.agent.model.model).toBe('claude-3');
      expect(config.agent.model.temperature).toBe(0.9);
      expect(config.guardrails.level).toBe('strict');
      expect(config.server.port).toBe(4000);
    } finally {
      process.cwd = originalCwd;
      // テンポラリファイルを削除
      if (fs.existsSync(tempConfigFile)) {
        fs.unlinkSync(tempConfigFile);
      }
      if (fs.existsSync(tempConfigDir)) {
        fs.rmdirSync(tempConfigDir);
      }
    }
  });

  it('should handle CORS_ORIGINS environment variable correctly', () => {
    process.env.CORS_ORIGINS = 'http://localhost:3000,https://example.com,https://app.example.com';
    
    const config = getConfig();
    
    expect(config.server.cors.origins).toEqual([
      'http://localhost:3000',
      'https://example.com', 
      'https://app.example.com'
    ]);
  });

  it('should handle numeric environment variables correctly', () => {
    process.env.PORT = '8080';
    process.env.RATE_LIMIT_WINDOW_MS = '30000';
    process.env.RATE_LIMIT_MAX = '100';
    process.env.MAX_TURNS = '15';
    
    const config = getConfig();
    
    expect(config.server.port).toBe(8080);
    expect(config.env.rateLimitWindowMs).toBe(30000);
    expect(config.env.rateLimitMax).toBe(100);
    expect(config.env.maxTurns).toBe(15);
  });

  it('should handle boolean environment variables correctly', () => {
    process.env.SERVER_ENABLED = 'true';
    process.env.CORS_ENABLED = 'false';
    
    const config = getConfig();
    
    expect(config.server.enabled).toBe(true);
    expect(config.server.cors.enabled).toBe(false);
  });

  it('should prioritize environment variables over JSON config', () => {
    // JSONファイルの設定
    const testConfig = {
      agent: {
        model: {
          provider: 'openai',
          model: 'gpt-4'
        }
      },
      server: {
        port: 3000
      }
    };

    // 一時的にconfig ディレクトリを作成し設定ファイルを配置
    const tempConfigDir = path.join(testConfigDir, 'config');
    const tempConfigFile = path.join(tempConfigDir, 'agent.config.json');
    
    fs.mkdirSync(tempConfigDir, { recursive: true });
    fs.writeFileSync(tempConfigFile, JSON.stringify(testConfig, null, 2));

    // 環境変数で上書き
    process.env.MODEL_PROVIDER = 'anthropic';
    process.env.PORT = '4000';
    
    // 一時的にprocess.cwdを変更
    const originalCwd = process.cwd.bind(process);
    process.cwd = () => testConfigDir;
    
    try {
      const config = getConfig();
      
      // 環境変数の値が優先されることを確認
      expect(config.agent.model.provider).toBe('anthropic');
      expect(config.server.port).toBe(4000);
    } finally {
      process.cwd = originalCwd;
      // テンポラリファイルを削除
      if (fs.existsSync(tempConfigFile)) {
        fs.unlinkSync(tempConfigFile);
      }
      if (fs.existsSync(tempConfigDir)) {
        fs.rmdirSync(tempConfigDir);
      }
    }
  });
});
