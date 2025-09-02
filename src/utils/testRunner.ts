import fs from 'fs/promises';
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
 */
export class TestRunner {
  private logger: Logger;
  private tempDir: string;

  constructor() {
    this.logger = new Logger('TestRunner');
    this.tempDir = path.join(process.cwd(), 'temp_tests');
  }

  /**
   * 生成されたテストコードを一時ディレクトリに書き出して実行
   */
  async executeGeneratedTests(testCode: string, targetCode?: string): Promise<TestExecutionResult> {
    try {
      await this.setupTempDirectory();
      
      // テストファイルと対象コードを一時ディレクトリに書き出し
      const testFilePath = path.join(this.tempDir, 'generated.test.ts');
      await fs.writeFile(testFilePath, testCode);
      
      if (targetCode) {
        const codeFilePath = path.join(this.tempDir, 'target.ts');
        await fs.writeFile(codeFilePath, targetCode);
      }

      // Jestを実行
      const result = await this.runJest(this.tempDir);
      
      this.logger.info('テスト実行完了', { 
        passed: result.passed, 
        failed: result.failed,
        total: result.total 
      });
      
      return result;
    } catch (error) {
      this.logger.error('テスト実行エラー', error as Error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * プロジェクト全体のテストスイートを実行
   */
  async executeProjectTests(): Promise<TestExecutionResult> {
    try {
      this.logger.info('プロジェクトテスト実行開始');
      const result = await this.runJest(process.cwd());
      
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
   * ESLintによる静的解析を実行
   */
  async runESLint(filePath?: string): Promise<{ issues: any[], score: number }> {
    return new Promise((resolve, reject) => {
      const targetPath = filePath || 'src/';
      const eslintProcess = spawn('npx', ['eslint', targetPath, '--format=json'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      eslintProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      eslintProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      eslintProcess.on('close', (code) => {
        try {
          const issues = output ? JSON.parse(output) : [];
          const totalIssues = issues.reduce((sum: number, file: any) => sum + file.messages.length, 0);
          
          // 簡易スコアリング: 問題数に基づいて100点満点で算出
          const score = Math.max(0, 100 - totalIssues * 5);
          
          this.logger.info('ESLint実行完了', { issues: totalIssues, score });
          resolve({ issues, score });
        } catch (error) {
          this.logger.error('ESLint結果解析エラー', error as Error);
          reject(error);
        }
      });
    });
  }

  /**
   * TypeScript型チェックを実行
   */
  async runTypeCheck(): Promise<{ success: boolean, errors: string[] }> {
    return new Promise((resolve) => {
      const tscProcess = spawn('npx', ['tsc', '--noEmit'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let errorOutput = '';

      tscProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      tscProcess.on('close', (code) => {
        const success = code === 0;
        const errors = errorOutput ? errorOutput.split('\n').filter(line => line.trim()) : [];
        
        this.logger.info('TypeScript型チェック完了', { success, errorCount: errors.length });
        resolve({ success, errors });
      });
    });
  }

  private async setupTempDirectory(): Promise<void> {
    try {
      await fs.access(this.tempDir);
      await fs.rm(this.tempDir, { recursive: true });
    } catch {
      // ディレクトリが存在しない場合は無視
    }
    
    await fs.mkdir(this.tempDir, { recursive: true });
    
    // 基本的なpackage.jsonとjest.config.jsをコピー
    const packageJsonContent = {
      "type": "module",
      "scripts": { "test": "jest" }
    };
    
    await fs.writeFile(
      path.join(this.tempDir, 'package.json'), 
      JSON.stringify(packageJsonContent, null, 2)
    );
  }

  private async runJest(cwd: string): Promise<TestExecutionResult> {
    return new Promise((resolve, reject) => {
      const jestProcess = spawn('npx', ['jest', '--json', '--coverage'], {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      jestProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      jestProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      jestProcess.on('close', (code) => {
        try {
          const result = this.parseJestOutput(output, errorOutput);
          resolve(result);
        } catch (error) {
          reject(new Error(`Jest実行エラー: ${errorOutput}`));
        }
      });
    });
  }

  private parseJestOutput(output: string, errorOutput: string): TestExecutionResult {
    try {
      const jsonResult = JSON.parse(output);
      
      return {
        passed: jsonResult.numPassedTests || 0,
        failed: jsonResult.numFailedTests || 0,
        total: jsonResult.numTotalTests || 0,
        coverage: jsonResult.coverageMap ? this.calculateCoverage(jsonResult.coverageMap) : undefined,
        details: this.extractTestDetails(jsonResult),
        errors: errorOutput ? [errorOutput] : []
      };
    } catch {
      // JSONパースに失敗した場合のフォールバック
      return {
        passed: 0,
        failed: 1,
        total: 1,
        details: [],
        errors: [errorOutput || 'テスト実行に失敗しました']
      };
    }
  }

  private extractTestDetails(jsonResult: any): TestDetail[] {
    const details: TestDetail[] = [];
    
    if (jsonResult.testResults) {
      for (const testFile of jsonResult.testResults) {
        for (const assertion of testFile.assertionResults || []) {
          details.push({
            name: assertion.title || assertion.fullName,
            status: assertion.status === 'passed' ? 'passed' : 'failed',
            duration: assertion.duration,
            error: assertion.failureMessages?.[0]
          });
        }
      }
    }
    
    return details;
  }

  private calculateCoverage(coverageMap: any): number {
    // 簡易的なカバレッジ計算
    // 実際の実装では istanbul/nyc の結果を解析
    return 0; // プレースホルダー
  }

  private async cleanup(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true });
    } catch (error) {
      this.logger.warn('一時ディレクトリの削除に失敗', { error: (error as Error).message });
    }
  }
}
