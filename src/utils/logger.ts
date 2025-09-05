/**
 * Logger ユーティリティ
 * 構造化ログ出力（trace IDを必ず付与）
 */
export class Logger {
  private traceId: string;
  private context: string;

  constructor(context = 'DefaultContext') {
    this.context = context;
    this.traceId = this.generateTraceId();
  }

  /**
   * 情報レベルのログ
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log('INFO', message, metadata);
  }

  /**
   * 警告レベルのログ
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log('WARN', message, metadata);
  }

  /**
   * エラーレベルのログ
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const errorMetadata = error ? {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      ...metadata
    } : metadata;
    
    this.log('ERROR', message, errorMetadata);
  }

  /**
   * デバッグレベルのログ
   */
  debug(message: string, metadata?: Record<string, any>): void {
    if (this.isDebugEnabled()) {
      this.log('DEBUG', message, metadata);
    }
  }

  /**
   * 操作開始のログ
   */
  operationStart(operation: string, metadata?: Record<string, any>): void {
    this.info(`Operation started: ${operation}`, {
      operation,
      phase: 'start',
      ...metadata
    });
  }

  /**
   * 操作完了のログ
   */
  operationEnd(operation: string, duration: number, metadata?: Record<string, any>): void {
    this.info(`Operation completed: ${operation}`, {
      operation,
      phase: 'end',
      duration,
      ...metadata
    });
  }

  /**
   * 操作失敗のログ
   */
  operationFailed(operation: string, error: Error, metadata?: Record<string, any>): void {
    this.error(`Operation failed: ${operation}`, error, {
      operation,
      phase: 'failed',
      ...metadata
    });
  }

  /**
   * 構造化ログの出力
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      traceId: this.traceId,
      context: this.context,
      message,
      metadata: metadata || {}
    };

    // 環境に応じてログ出力先を変更
    const output = this.formatLogEntry(logEntry);
    
    if (level === 'ERROR') {
      console.error(output);
    } else if (level === 'WARN') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  /**
   * ログエントリのフォーマット
   */
  private formatLogEntry(logEntry: LogEntry): string {
    if (this.isJsonLoggingEnabled()) {
      return JSON.stringify(logEntry);
    } else {
      return `[${logEntry.timestamp}] [${logEntry.level}] [${logEntry.traceId}] [${logEntry.context}] ${logEntry.message}${
        Object.keys(logEntry.metadata).length > 0 ? ` | ${JSON.stringify(logEntry.metadata)}` : ''
      }`;
    }
  }

  /**
   * Trace IDを生成
   */
  private generateTraceId(): string {
    return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * デバッグモードが有効かチェック
   */
  private isDebugEnabled(): boolean {
    // 実際の実装では環境変数等をチェック
    return process.env.LOG_LEVEL === 'DEBUG' || process.env.NODE_ENV === 'development';
  }

  /**
   * JSONログ出力が有効かチェック
   */
  private isJsonLoggingEnabled(): boolean {
    // 実際の実装では環境変数等をチェック
    return process.env.LOG_FORMAT === 'json';
  }

  /**
   * 新しいTrace IDを設定
   */
  setTraceId(traceId: string): void {
    this.traceId = traceId;
  }

  /**
   * 現在のTrace IDを取得
   */
  getTraceId(): string {
    return this.traceId;
  }

  /**
   * コンテキストを設定
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * 子ロガーを作成
   */
  child(context: string, traceId?: string): Logger {
    const childLogger = new Logger(context);
    childLogger.setTraceId(traceId || this.traceId);
    return childLogger;
  }
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  traceId: string;
  context: string;
  message: string;
  metadata: Record<string, any>;
}

// シングルトンインスタンスのエクスポート
export const logger = new Logger('StrongAgent');
