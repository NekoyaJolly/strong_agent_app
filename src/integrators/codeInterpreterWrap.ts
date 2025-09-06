/**
 * Code Interpreter Wrapper
 * コード実行機能のラッパー
 */
export class CodeInterpreterWrapper {
  private sandboxMode = true;
  private allowedLanguages: string[] = ['javascript', 'typescript', 'python'];
  private timeout = 30000; // 30秒

  constructor(options?: CodeInterpreterOptions) {
    if (options) {
      this.sandboxMode = options.sandboxMode ?? true;
      this.allowedLanguages = options.allowedLanguages ?? this.allowedLanguages;
      this.timeout = options.timeout ?? this.timeout;
    }
  }

  /**
   * コードを実行
   */
  async executeCode(code: string, language: string, options?: ExecutionOptions): Promise<ExecutionResult> {
    // 言語チェック
    if (!this.allowedLanguages.includes(language.toLowerCase())) {
      return {
        success: false,
        error: `Language ${language} is not allowed. Allowed languages: ${this.allowedLanguages.join(', ')}`,
        executionTime: 0
      };
    }

    const startTime = Date.now();

    try {
      console.log(`Executing ${language} code in ${this.sandboxMode ? 'sandbox' : 'direct'} mode`);
      
      // コードの安全性チェック
      const securityCheck = this.performSecurityCheck(code, language);
      if (!securityCheck.safe) {
        return {
          success: false,
          error: `Security check failed: ${securityCheck.reason ?? 'Unknown reason'}`,
          executionTime: Date.now() - startTime
        };
      }

      // 実際のコード実行
      const result = await this.runCode(code, language, options);
      
      return {
        success: true,
        output: result.output,
        executionTime: Date.now() - startTime,
        metadata: result.metadata
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * JavaScript/TypeScriptコードを実行
   */
  async executeJavaScript(code: string): Promise<ExecutionResult> {
    return this.executeCode(code, 'javascript');
  }

  /**
   * Pythonコードを実行
   */
  async executePython(code: string): Promise<ExecutionResult> {
    return this.executeCode(code, 'python');
  }

  /**
   * セキュリティチェック
   */
  private performSecurityCheck(code: string, _language: string): SecurityCheckResult {
    const dangerousPatterns = [
      /require\s*\(\s*['"]fs['"]\s*\)/, // Node.js fs module
      /import.*fs.*from/, // ES6 fs import
      /exec\s*\(/, // Command execution
      /eval\s*\(/, // Code evaluation
      /Function\s*\(/, // Dynamic function creation
      /__import__/, // Python dynamic import
      /os\.system/, // Python system calls
      /subprocess/, // Python subprocess
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        return {
          safe: false,
          reason: `Potentially dangerous pattern detected: ${pattern.source}`
        };
      }
    }

    return { safe: true };
  }

  /**
   * 実際のコード実行処理
   */
  private async runCode(code: string, language: string, options?: ExecutionOptions): Promise<InternalExecutionResult> {
    // タイムアウト設定
    const executionTimeout = options?.timeout ?? this.timeout;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Code execution timed out after ${executionTimeout.toString()}ms`));
      }, executionTimeout);

      try {
        if (language === 'javascript' || language === 'typescript') {
          // JavaScript/TypeScript実行のシミュレーション
          clearTimeout(timeoutId);
          resolve({
            output: 'Code executed successfully (simulated)',
            metadata: {
              language,
              sandboxMode: this.sandboxMode,
              timestamp: new Date()
            }
          });
        } else if (language === 'python') {
          // Python実行のシミュレーション
          clearTimeout(timeoutId);
          resolve({
            output: 'Python code executed successfully (simulated)',
            metadata: {
              language,
              sandboxMode: this.sandboxMode,
              timestamp: new Date()
            }
          });
        } else {
          clearTimeout(timeoutId);
          reject(new Error(`Unsupported language: ${language}`));
        }
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * 許可された言語を取得
   */
  getAllowedLanguages(): string[] {
    return [...this.allowedLanguages];
  }

  /**
   * サンドボックスモードの設定
   */
  setSandboxMode(enabled: boolean): void {
    this.sandboxMode = enabled;
  }

  /**
   * タイムアウトの設定
   */
  setTimeout(timeoutMs: number): void {
    this.timeout = timeoutMs;
  }
}

export interface CodeInterpreterOptions {
  sandboxMode?: boolean;
  allowedLanguages?: string[];
  timeout?: number;
}

export interface ExecutionOptions {
  timeout?: number;
  environment?: Record<string, unknown>;
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime: number;
  metadata?: Record<string, unknown>;
}

interface InternalExecutionResult {
  output: string;
  metadata?: Record<string, unknown>;
}

interface SecurityCheckResult {
  safe: boolean;
  reason?: string;
}
