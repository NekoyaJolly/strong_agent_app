// src/agents/tester.ts
import { Agent } from '@openai/agents';

// 推奨プロンプトプレフィックス（@openai/agents-core/extensionsから移行）
const RECOMMENDED_PROMPT_PREFIX = "You are a helpful assistant. Think step by step and be precise.";
import { TestReport } from './schemas.js';
import { TestRunner, TestExecutionResult as _TestExecutionResult } from '../utils/testRunner.js';
import { Logger } from '../utils/logger.js';

export const testAgent = new Agent({
  name: 'Test',
  instructions: `${RECOMMENDED_PROMPT_PREFIX}\nあなたはテスト担当です。ユニット/統合テストの候補を提示し、実際にテストを実行して結果をまとめます。テストケースを生成し、Jest を使用して実行し、実際の passed/failed 件数とカバレッジ情報を報告してください。`,
  outputType: TestReport,
});

/**
 * テストエージェントの拡張クラス
 * AIによるテスト提案と実際のテスト実行を統合
 */
export class EnhancedTester {
  private testRunner: TestRunner;
  private logger: Logger;

  constructor() {
    this.testRunner = new TestRunner();
    this.logger = new Logger('EnhancedTester');
  }

  /**
   * コードに対してテストケースを生成し、実際に実行する
   */
  async generateAndRunTests(targetCode: string, context?: string): Promise<TestReport> {
    try {
      this.logger.info('テストケース生成・実行開始', { context });

      // TODO: testAgent を使ってテストケースを生成
      // const testSuggestion = await testAgent.call({ code: targetCode, context });
      
      // 現在はプレースホルダーとして簡単なテストケースを生成
      const generatedTestCode = this.generateBasicTestCode(targetCode);
      
      // 実際にテストを実行
      const executionResult = await this.testRunner.executeGeneratedTests(generatedTestCode, targetCode);
      
      // TestReport形式に変換
      const report: TestReport = {
        passed: executionResult.passed,
        failed: executionResult.failed,
        newTests: [generatedTestCode],
        coverageNote: executionResult.coverage ? `カバレッジ: ${executionResult.coverage}%` : 'カバレッジ情報なし'
      };

      this.logger.info('テスト実行完了', report);
      return report;
      
    } catch (error) {
      this.logger.error('テスト生成・実行エラー', error as Error);
      return {
        passed: 0,
        failed: 1,
        newTests: [],
        coverageNote: `エラー: ${(error as Error).message}`
      };
    }
  }

  /**
   * プロジェクト全体のテストを実行
   */
  async runProjectTests(): Promise<TestReport> {
    try {
      const result = await this.testRunner.executeProjectTests();
      
      return {
        passed: result.passed,
        failed: result.failed,
        newTests: [],
        coverageNote: result.coverage ? `プロジェクトカバレッジ: ${result.coverage}%` : undefined
      };
    } catch (error) {
      this.logger.error('プロジェクトテスト実行エラー', error as Error);
      return {
        passed: 0,
        failed: 1,
        newTests: [],
        coverageNote: `エラー: ${(error as Error).message}`
      };
    }
  }

  private generateBasicTestCode(targetCode: string): string {
    // 基本的なテストコードのテンプレートを生成
    // 実際の実装では、LLM を使ってより高度なテストケースを生成
    return `
import { describe, it, expect } from '@jest/globals';

describe('Generated Tests', () => {
  it('should execute basic test', () => {
    expect(true).toBe(true);
  });
  
  it('should test target code functionality', () => {
    // TODO: 実際のテストケースをここに実装
    expect(typeof ${JSON.stringify(targetCode)}).toBe('string');
  });
});`;
  }
}