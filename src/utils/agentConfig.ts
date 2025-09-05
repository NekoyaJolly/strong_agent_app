// src/utils/agentConfig.ts - OpenAI Agents SDK 設定
import { 
  setDefaultOpenAIKey, 
  setTracingDisabled,
  setTracingExportApiKey,
  startTraceExportLoop,
  getLogger 
} from '@openai/agents';

/**
 * OpenAI Agents SDK の初期化
 * アプリケーション起動時に一度だけ呼び出す
 */
export function initializeAgentSDK(): void {
  console.log('🔧 [AgentSDK] Initializing OpenAI Agents SDK...');

  // 1. OpenAI API Key の設定
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  setDefaultOpenAIKey(openaiKey);
  console.log('✅ [AgentSDK] OpenAI API Key configured');

  // 2. トレーシング設定
  const tracingDisabled = process.env.TRACING_DISABLED === 'true' || process.env.NODE_ENV === 'test';
  setTracingDisabled(tracingDisabled);
  
  if (tracingDisabled) {
    console.log('🚫 [AgentSDK] Tracing disabled');
  } else {
    console.log('📊 [AgentSDK] Tracing enabled');
    
    // 3. トレーシング API Key とエクスポートループの設定
    const tracingApiKey = process.env.OPENAI_TRACING_API_KEY;
    if (tracingApiKey) {
      setTracingExportApiKey(tracingApiKey);
      startTraceExportLoop(); // 非同期エクスポート開始
      console.log('📤 [AgentSDK] Trace export loop started');
    } else {
      console.log('⚠️ [AgentSDK] OPENAI_TRACING_API_KEY not provided - traces will not be exported');
    }
  }

  // 4. 環境別設定
  if (process.env.NODE_ENV === 'development') {
    process.env.DEBUG = 'openai-agents*';
    console.log('🔍 [AgentSDK] Debug logging enabled for development');
  }

  if (process.env.NODE_ENV === 'production') {
    process.env.OPENAI_AGENTS_DONT_LOG_MODEL_DATA = '1';
    process.env.OPENAI_AGENTS_DONT_LOG_TOOL_DATA = '1';
    console.log('🔒 [AgentSDK] Production mode: Sensitive data logging disabled');
  }

  console.log('🎉 [AgentSDK] OpenAI Agents SDK initialization complete');
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
