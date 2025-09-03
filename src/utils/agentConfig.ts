// src/utils/agentConfig.ts - OpenAI Agents SDK 設定
import { 
  setDefaultOpenAIKey, 
  setTracingDisabled,
  setTracingExportApiKey,
  getLogger 
} from '@openai/agents';

/**
 * OpenAI Agents SDK の初期設定を行う
 * アプリケーション起動時に一度だけ実行する
 */
export function initializeAgentSDK() {
  // 1. APIキー設定
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  setDefaultOpenAIKey(apiKey);

  // 2. 環境別トレーシング設定
  if (process.env.NODE_ENV === 'test') {
    // テスト環境：トレーシングを無効化（外部通信を防止）
    setTracingDisabled(true);
    console.log('🧪 Test environment: Tracing disabled');
  } else {
    // 開発・本番環境：トレーシングを有効化
    setTracingExportApiKey(apiKey);
    console.log(`🚀 ${process.env.NODE_ENV || 'development'} environment: Tracing enabled`);
  }

  // 3. 開発環境でのデバッグログ設定
  if (process.env.NODE_ENV === 'development') {
    process.env.DEBUG = 'openai-agents*';
    console.log('🔍 Debug logging enabled for OpenAI Agents');
  }

  // 4. 本番環境での敏感データ保護
  if (process.env.NODE_ENV === 'production') {
    process.env.OPENAI_AGENTS_DONT_LOG_MODEL_DATA = '1';
    process.env.OPENAI_AGENTS_DONT_LOG_TOOL_DATA = '1';
    console.log('🔒 Production mode: Sensitive data logging disabled');
  }

  console.log('✅ OpenAI Agents SDK initialized successfully');
}

/**
 * ワークフロー専用ロガー
 */
export const workflowLogger = getLogger('workflow-orchestrator');

/**
 * エージェント実行専用ロガー  
 */
export const agentLogger = getLogger('agent-execution');

/**
 * テスト用ロガー
 */
export const testLogger = getLogger('test-environment');
