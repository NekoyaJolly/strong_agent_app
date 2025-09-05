// src/utils/agentRunner.ts - エラー耐性のあるエージェント実行ラッパー
import type { 
  Agent} from '@openai/agents';
import { 
  MaxTurnsExceededError,
  ModelBehaviorError,
  GuardrailExecutionError,
  ToolCallError
} from '@openai/agents';
import { getSharedRunner } from './sharedRunner.js';

export interface AgentRunResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    turns?: number;
    tokens?: number;
    duration?: number;
    errorType?: string;
  };
  recoverable?: boolean;
  state?: any; // GuardrailExecutionError.state for recovery
}

export interface AgentRunOptions {
  maxTurns?: number;
  timeout?: number;
  retries?: number;
  context?: any;
  signal?: AbortSignal;
}

/**
 * エラー耐性を持つエージェント実行ラッパー
 * ベストプラクティスに従ったエラーハンドリングを提供
 */
export class SafeAgentRunner {
  /**
   * エージェントを安全に実行し、SDK固有エラーを適切に処理
   */
  static async runAgent(
    agent: Agent<any>,
    input: string,
    options: AgentRunOptions = {}
  ): Promise<AgentRunResult> {
    const startTime = Date.now();
    const runner = getSharedRunner();
    
    try {
      // タイムアウト設定
      const timeoutPromise = options.timeout 
        ? new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Agent execution timeout')), options.timeout)
          )
        : null;

      // エージェント実行
      const runPromise = runner.run(agent, input, {
        maxTurns: options.maxTurns || 10,
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
          duration
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // SDK固有エラーの詳細処理
      if (error instanceof GuardrailExecutionError && error.state) {
        console.warn('[SafeAgentRunner] Guardrail execution failed, state available for recovery');
        return {
          success: false,
          error: error.message,
          metadata: { 
            duration, 
            errorType: 'GuardrailExecutionError' 
          },
          recoverable: true,
          state: error.state
        };
      }

      if (error instanceof MaxTurnsExceededError) {
        console.warn(`[SafeAgentRunner] Maximum turns (${options.maxTurns || 10}) exceeded`);
        return {
          success: false,
          error: `Maximum turns (${options.maxTurns || 10}) exceeded`,
          metadata: { 
            duration, 
            errorType: 'MaxTurnsExceededError' 
          },
          recoverable: false
        };
      }

      if (error instanceof ModelBehaviorError) {
        console.warn('[SafeAgentRunner] Model behavior error:', error.message);
        return {
          success: false,
          error: `Model behavior error: ${error.message}`,
          metadata: { 
            duration, 
            errorType: 'ModelBehaviorError' 
          },
          recoverable: true
        };
      }

      if (error instanceof ToolCallError) {
        console.warn('[SafeAgentRunner] Tool call error:', error.message);
        return {
          success: false,
          error: `Tool call error: ${error.message}`,
          metadata: { 
            duration, 
            errorType: 'ToolCallError' 
          },
          recoverable: true
        };
      }

      // その他のエラー
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[SafeAgentRunner] Unexpected error:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        metadata: { 
          duration, 
          errorType: 'UnknownError' 
        },
        recoverable: true // 未知のエラーはリトライ可能とする
      };
    }
  }

  /**
   * リトライ機能付きエージェント実行
   */
  static async runAgentWithRetry(
    agent: Agent<any>,
    input: string,
    options: AgentRunOptions = {}
  ): Promise<AgentRunResult> {
    const { retries = 2, ...runOptions } = options;
    let lastError = '';

    for (let attempt = 0; attempt <= retries; attempt++) {
      const result = await this.runAgent(agent, input, runOptions);

      // 成功の場合は即座に返す
      if (result.success) {
        return result;
      }

      lastError = result.error || 'Unknown error';

      // 回復不可能なエラーの場合は即座に返す
      if (result.recoverable === false) {
        return result;
      }

      // 最後の試行でない場合は少し待機
      if (attempt < retries) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`[SafeAgentRunner] Retrying in ${backoffDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }

    // 全ての試行が失敗した場合
    return {
      success: false,
      error: `Failed after ${retries} retry attempts. Last error: ${lastError}`,
      metadata: {
        errorType: 'RetryExhausted'
      },
      recoverable: false
    };
  }
}

/**
 * 後方互換性のための便利関数
 * 従来のrun()呼び出しを置き換え
 */
export async function safeRun(agent: Agent<any>, input: string, options?: AgentRunOptions) {
  const result = await SafeAgentRunner.runAgent(agent, input, options);
  return result.success ? result.data : null;
}
