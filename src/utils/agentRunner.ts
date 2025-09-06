// src/utils/agentRunner.ts - エラー耐性のあるエージェント実行ラッパー
import type { 
  Agent} from '@openai/agents';
import { getSharedRunner } from './sharedRunner.js';

export interface AgentRunResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    turns?: number;
    tokens?: number;
    duration?: number;
    errorType?: string;
  };
  recoverable?: boolean;
  state?: unknown; // GuardrailExecutionError.state for recovery
}

export interface AgentRunOptions {
  maxTurns?: number;
  timeout?: number;
  retries?: number;
  context?: unknown;
  signal?: AbortSignal;
}

/**
 * エージェントを安全に実行し、SDK固有エラーを適切に処理
 * 
 * @param agent - 実行するエージェント
 * @param input - エージェントへの入力
 * @param options - 実行オプション
 * @returns 実行結果
 */
export async function runAgent(
  agent: Agent,
  input: string,
  options: AgentRunOptions = {}
): Promise<AgentRunResult> {
  const startTime = Date.now();
  const runner = getSharedRunner();
  
  try {
    // タイムアウト設定
    const timeoutPromise = options.timeout 
      ? new Promise<never>((_, reject) => 
          setTimeout(() => { reject(new Error('Agent execution timeout')); }, options.timeout)
        )
      : null;

    // エージェント実行
    const runPromise = runner.run(agent, input, {
      maxTurns: options.maxTurns ?? 10,
      context: options.context,
      signal: options.signal
    });

    const result = timeoutPromise 
      ? await Promise.race([runPromise, timeoutPromise])
      : await runPromise;

    const duration = Date.now() - startTime;

    // 成功結果の構築
    return {
      success: true,
      data: result.finalOutput,
      metadata: {
        duration,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        turns: (result as any).messages?.length ?? 0,
        errorType: undefined
      },
      recoverable: true
    };

  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`[runAgent] Execution failed after ${duration.toString()}ms:`, errorMessage);

    // エラー分類と回復可能性の判定
    const { errorType, recoverable } = categorizeAgentError(error);

    return {
      success: false,
      error: errorMessage,
      metadata: {
        duration,
        errorType
      },
      recoverable
    };
  }
}

/**
 * エージェントエラーを分類し、回復可能性を判定
 */
function categorizeAgentError(error: unknown): { errorType: string; recoverable: boolean } {
  if (error instanceof Error) {
    // SDK固有エラーの分類
    if (error.name === 'GuardrailExecutionError') {
      return { errorType: 'GuardrailExecutionError', recoverable: true };
    }
    if (error.name === 'MaxTurnsExceededError') {
      return { errorType: 'MaxTurnsExceededError', recoverable: false };
    }
    if (error.name === 'ModelBehaviorError') {
      return { errorType: 'ModelBehaviorError', recoverable: true };
    }
    if (error.name === 'ToolCallError') {
      return { errorType: 'ToolCallError', recoverable: true };
    }
  }
  
  // その他のエラーはリトライ可能とする
  return { errorType: 'UnknownError', recoverable: true };
}

/**
 * リトライ機能付きでエージェントを実行
 * 
 * @param agent - 実行するエージェント
 * @param input - エージェントへの入力
 * @param retries - リトライ回数（デフォルト: 2）
 * @param options - 実行オプション
 * @returns 実行結果
 */
export async function runAgentWithRetry(
  agent: Agent,
  input: string,
  retries = 2,
  options: AgentRunOptions = {}
): Promise<AgentRunResult> {
  let lastError = '';

  for (let attempt = 0; attempt <= retries; attempt++) {
    console.log(`[runAgentWithRetry] Attempt ${(attempt + 1).toString()}/${(retries + 1).toString()}...`);
    
    const result = await runAgent(agent, input, {
      ...options,
      timeout: options.timeout ?? 30000 // デフォルト30秒タイムアウト
    });

    // 成功の場合は即座に返す
    if (result.success) {
      if (attempt > 0) {
        console.log(`[runAgentWithRetry] Success on attempt ${(attempt + 1).toString()}`);
      }
      return result;
    }

    lastError = result.error ?? 'Unknown error';

    // 回復不可能なエラーの場合は即座に返す
    if (result.recoverable === false) {
      return result;
    }

    // 最後の試行でない場合は少し待機
    if (attempt < retries) {
      const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 5000);
      console.log(`[runAgentWithRetry] Retrying in ${backoffDelay.toString()}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }

  // 全ての試行が失敗した場合
  return {
    success: false,
    error: `Failed after ${retries.toString()} retry attempts. Last error: ${lastError}`,
    metadata: {
      errorType: 'RetryExhausted'
    },
    recoverable: false
  };
}

/**
 * 後方互換性のための便利関数
 * 従来のrun()呼び出しを置き換え
 * @deprecated 代わりに runAgent() 関数を使用してください
 */
export async function safeRun(agent: Agent, input: string, options?: AgentRunOptions): Promise<unknown> {
  const result = await runAgent(agent, input, options);
  return result.success ? result.data : undefined;
}
