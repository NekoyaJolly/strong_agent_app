// src/index.ts（置き換え）
import 'dotenv/config';
import { initializeAgentSDK } from './utils/agentConfig.js';
import { sharedRunner } from './utils/sharedRunner.js';
import { startServer } from './runners/serverRunner.js';
import { triageAgent } from './agent/triage.js';
import { cliWorkflowRunner } from './runners/workflowRunner.js';
import { loadOpenAIKeyFromSecrets } from './utils/env.js';
import { SafeAgentRunner } from './utils/agentRunner.js';

const MODE = process.env.RUN_MODE ?? (process.env.NODE_ENV === 'production' ? 'server' : 'cli');
const USE_WORKFLOW = process.env.USE_WORKFLOW === 'true';

// Phase 1: OpenAI Agents SDK の適切な初期化
async function initializeApplication() {
  try {
    // 環境変数の読み込み
    loadOpenAIKeyFromSecrets();
    
    // SDK初期化（APIキー、トレーシング等）
    initializeAgentSDK();
    
    // 共有Runnerインスタンスの初期化
    sharedRunner.initialize({
      model: process.env.DEFAULT_MODEL || 'gpt-4o',
      workflowName: 'Strong Agent Application',
      tracingDisabled: process.env.NODE_ENV === 'test'
    });
    
    console.log('🚀 Application initialized successfully');
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    process.exit(1);
  }
}

if (MODE === 'server') {
  await initializeApplication();
  await startServer();
} else {
  await initializeApplication();
  
  const input = process.argv.slice(2).join(' ') || '稼働テスト';
  
  if (USE_WORKFLOW) {
    // 新しいワークフローシステムを使用
    await cliWorkflowRunner({
      project: 'default',
      task: input,
      requireApproval: process.env.REQUIRE_APPROVAL === 'true',
      maxIterations: parseInt(process.env.MAX_ITERATIONS || '3')
    });
  } else {
    // 従来のTriageエージェントを使用（新しいSafeAgentRunnerで実行）
    console.log('🤖 Running Triage Agent with input:', input);
    
    const result = await SafeAgentRunner.runAgent(triageAgent, input, { 
      maxTurns: 4,
      timeout: 60000 
    });
    
    if (result.success) {
      console.log('✅ Agent execution completed successfully');
      console.log(result.data || 'No output');
    } else {
      console.error('❌ Agent execution failed:', result.error);
      if (result.recoverable) {
        console.log('💡 This error might be recoverable with retry');
      }
    }
  }
}
