// src/utils/sharedRunner.ts - グローバルRunnerインスタンス管理
import { Runner } from '@openai/agents';

/**
 * Runner初期化オプション
 */
interface RunnerInitOptions {
  model?: string;
  workflowName?: string;
  tracingDisabled?: boolean;
  traceIncludeSensitiveData?: boolean;
}

/**
 * アプリケーション全体で共有するRunnerインスタンス
 * ベストプラクティス: "Create a Runner when your app starts and reuse it across requests"
 */
class SharedRunnerManager {
  private static instance: SharedRunnerManager;
  private runner: Runner | null = null;
  private isInitialized = false;

  private constructor() {
    // シングルトンパターン
  }

  static getInstance(): SharedRunnerManager {
    if (!SharedRunnerManager.instance) {
      SharedRunnerManager.instance = new SharedRunnerManager();
    }
    return SharedRunnerManager.instance;
  }

  /**
   * Runnerインスタンスを初期化
   * アプリケーション起動時に一度だけ呼び出す
   */
  initialize(options: RunnerInitOptions = {}): void {
    if (this.isInitialized) {
      console.warn('[SharedRunner] Runner is already initialized');
      return;
    }

    const config = {
      model: options.model ?? 'gpt-4o',
      workflowName: options.workflowName ?? 'Strong Agent Workflow',
      tracingDisabled: options.tracingDisabled ?? (process.env.NODE_ENV === 'test'),
      traceIncludeSensitiveData: options.traceIncludeSensitiveData ?? (process.env.NODE_ENV !== 'production'),
      traceMetadata: {
        environment: process.env.NODE_ENV ?? 'development',
        version: process.env.npm_package_version ?? '1.0.0',
        application: 'strong-agent-app',
        nodeVersion: process.version
      }
    };

    this.runner = new Runner(config);
    this.isInitialized = true;

    console.log('✅ [SharedRunner] Runner instance initialized:', {
      model: config.model,
      workflowName: config.workflowName,
      tracingDisabled: config.tracingDisabled,
      traceMetadata: config.traceMetadata
    });
  }

  /**
   * 初期化されたRunnerインスタンスを取得
   */
  getRunner(): Runner {
    if (!this.isInitialized || !this.runner) {
      throw new Error(
        'Runner not initialized. Call SharedRunnerManager.getInstance().initialize() first.'
      );
    }
    return this.runner;
  }

  /**
   * Runner設定情報を取得（デバッグ用）
   */
  getRunnerInfo(): { isInitialized: boolean; hasRunner: boolean } {
    return {
      isInitialized: this.isInitialized,
      hasRunner: this.runner !== null
    };
  }

  /**
   * テスト用: Runnerインスタンスをリセット
   * 本番環境では使用しない
   */
  resetForTesting(): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('resetForTesting() can only be called in test environment');
    }
    this.runner = null;
    this.isInitialized = false;
    console.log('🧪 [WorkflowLogger] Runner instance reset for testing');
  }
}

/**
 * 共有Runnerインスタンスマネージャー
 */
export const sharedRunner = SharedRunnerManager.getInstance();

/**
 * 便利関数: 初期化されたRunnerを取得
 */
export function getSharedRunner(): Runner {
  return sharedRunner.getRunner();
}
