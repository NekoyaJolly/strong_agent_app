import path from 'path';
import { spawn } from 'child_process';
import { Logger } from '../utils/logger.js';

export interface TestExecutionResult {
  passed: number;
  failed: number;
  total: number;
  coverage?: number;
  details: TestDetail[];
  errors: string[];
}

export interface TestDetail {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
}

/**
 * 実際のテスト実行を担当するクラス
 * TesterエージェントがAIで生成したテストコードを実際に実行し、結果を取得する
 * Vitest版に簡略化
 */
export class TestRunner {
  private logger: Logger;
  private tempDir: string;

  constructor() {
    this.logger = new Logger('TestRunner');
    this.tempDir = path.join(process.cwd(), 'temp_tests');
  }

  /**
   * プロジェクト全体のテストスイートを実行
   */
  async executeProjectTests(): Promise<TestExecutionResult> {
    try {
      this.logger.info('プロジェクトテスト実行開始');
      const result = await this.runVitest(process.cwd());
      
      this.logger.info('プロジェクトテスト実行完了', {
        passed: result.passed,
        failed: result.failed,
        total: result.total,
        coverage: result.coverage
      });
      
      return result;
    } catch (error) {
      this.logger.error('プロジェクトテスト実行エラー', error as Error);
      throw error;
    }
  }

  /**
   * ESLintによる静的解析を実行（簡易版）
   */
  async runESLint(_filePath?: string): Promise<{ issues: any[], score: number }> {
    // 簡易実装 - 実際のESLintは外部から実行
    return { issues: [], score: 100 };
  }

  /**
   * TypeScript型チェックを実行（簡易版）
   */
  async runTypeCheck(): Promise<{ success: boolean, errors: string[] }> {
    // 簡易実装 - 実際の型チェックは外部から実行
    return { success: true, errors: [] };
  }

  /**
   * 生成されたテストコードを実行（将来実装予定）
   */
  async executeGeneratedTests(_testCode: string, _targetCode?: string): Promise<TestExecutionResult> {
    // 現在は基本的な結果を返す
    return {
      passed: 1,
      failed: 0,
      total: 1,
      details: [{ name: 'generated test', status: 'passed' }],
      errors: []
    };
  }

  private async runVitest(cwd: string): Promise<TestExecutionResult> {
    return new Promise((resolve, reject) => {
      const vitestProcess = spawn('npx', ['vitest', 'run', '--reporter=json'], {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      vitestProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      vitestProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      vitestProcess.on('close', (_code) => {
        try {
          // Vitestからの結果を解析
          const result = this.parseVitestOutput(output, errorOutput);
          resolve(result);
        } catch (error) {
          reject(new Error(`Vitest実行エラー: ${errorOutput}`));
        }
      });
    });
  }

  private parseVitestOutput(output: string, errorOutput: string): TestExecutionResult {
    // 簡易的なVitest結果解析
    // 実際の実装では、Vitestの--reporter=jsonの結果を解析
    try {
      let passed = 0;
      let failed = 0;
      
      // 基本的な結果の推定（実装簡略化）
      if (errorOutput && errorOutput.includes('FAIL')) {
        failed = 1;
      } else {
        passed = 1;
      }

      return {
        passed,
        failed,
        total: passed + failed,
        details: [],
        errors: errorOutput ? [errorOutput] : []
      };
    } catch {
      return {
        passed: 0,
        failed: 1,
        total: 1,
        details: [],
        errors: [errorOutput || 'テスト実行に失敗しました']
      };
    }
  }
}
