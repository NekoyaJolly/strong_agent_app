// src/agents/reviewer.ts
import { Agent } from '@openai/agents';
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';
import { ReviewReport } from './schemas.js';
import { TestRunner, type ESLintResult, type TypeCheckResult } from '../utils/testRunner.js';
import { Logger } from '../utils/logger.js';

// レビュー課題の型定義
interface ReviewIssue {
  kind: 'eslint' | 'typescript' | 'system';
  path?: string;
  message: string;
  severity: 'info' | 'warn' | 'error';
}

export const reviewerAgent = new Agent({
  name: 'Reviewer/Static-Analysis',
  instructions: `${RECOMMENDED_PROMPT_PREFIX}\nあなたはコードレビュー担当です。設計逸脱、危険API、型不整合、循環依存などを指摘し、ESLintや型チェックツールと連携して実際の静的解析結果も統合し、100点満点で採点します。`,
  outputType: ReviewReport,
});

/**
 * レビューエージェントの拡張クラス
 * AIによるコードレビューと実際の静的解析ツール実行を統合
 */
export class EnhancedReviewer {
  private testRunner: TestRunner;
  private logger: Logger;

  constructor() {
    this.testRunner = new TestRunner();
    this.logger = new Logger('EnhancedReviewer');
  }

  /**
   * コードレビューを実行（AI分析 + 静的解析ツール）
   */
  async performReview(code: string, filePath?: string): Promise<ReviewReport> {
    try {
      this.logger.info('コードレビュー開始', { filePath });

      // 並行してESLintと型チェックを実行
      const [eslintResult, typeCheckResult]: [ESLintResult, TypeCheckResult] = await Promise.all([
        this.testRunner.runESLint(filePath),
        this.testRunner.runTypeCheck()
      ]);

      // 静的解析の結果をReviewReport形式に変換
      const issues: ReviewIssue[] = [];

      // ESLintの結果を統合
      if (Array.isArray(eslintResult.issues)) {
        for (const file of eslintResult.issues) {
          if (Array.isArray(file.messages)) {
            for (const message of file.messages) {
              issues.push({
                kind: 'eslint',
                path: file.filePath,
                message: `${message.ruleId ?? 'unknown'}: ${message.message} (行:${message.line.toString()})`,
                severity: this.mapESLintSeverity(message.severity)
              });
            }
          }
        }
      }

      // TypeScript型チェックの結果を統合
      if (!typeCheckResult.success) {
        for (const error of typeCheckResult.errors) {
          issues.push({
            kind: 'typescript',
            message: error,
            severity: 'error' as const
          });
        }
      }

      // スコアを計算（ESLintスコア + 型チェック結果 + エラー数による調整）
      let score = eslintResult.score;
      if (!typeCheckResult.success) {
        score = Math.max(0, score - 20); // 型エラーがある場合は大幅減点
      }

      // 総合的なエラー数による調整
      const totalErrors = issues.filter(issue => issue.severity === 'error').length;
      const totalWarnings = issues.filter(issue => issue.severity === 'warn').length;
      score = Math.max(0, score - totalErrors * 10 - totalWarnings * 2);

      const report: ReviewReport = {
        summary: this.generateSummary(issues, score),
        issues,
        score,
        actionItems: this.generateActionItems(issues)
      };

      this.logger.info('コードレビュー完了', { 
        issueCount: issues.length, 
        score,
        eslintScore: eslintResult.score,
        typeCheckSuccess: typeCheckResult.success
      });

      return report;

    } catch (error) {
      this.logger.error('コードレビューエラー', error as Error);
      return {
        summary: `レビュー実行中にエラーが発生しました: ${(error as Error).message}`,
        issues: [{
          kind: 'system',
          message: `レビューツール実行エラー: ${(error as Error).message}`,
          severity: 'error'
        }],
        score: 0,
        actionItems: []
      };
    }
  }

  /**
   * プロジェクト全体の静的解析を実行
   */
  async reviewProject(): Promise<ReviewReport> {
    return this.performReview('', undefined); // ファイルパス未指定で全体をチェック
  }

  private mapESLintSeverity(severity: number): 'info' | 'warn' | 'error' {
    switch (severity) {
      case 2: return 'error';
      case 1: return 'warn';
      default: return 'info';
    }
  }

  private generateSummary(issues: ReviewIssue[], score: number): string {
    const errorCount = issues.filter(issue => issue.severity === 'error').length;
    const warningCount = issues.filter(issue => issue.severity === 'warn').length;
    
    if (issues.length === 0) {
      return `✅ 静的解析で問題は検出されませんでした。スコア: ${score.toString()}/100`;
    }
    
    return `静的解析完了: ${errorCount.toString()}個のエラー、${warningCount.toString()}個の警告を検出。スコア: ${score.toString()}/100`;
  }

  private generateActionItems(issues: ReviewIssue[]): { id: string, title: string, detail: string, estimateH?: number }[] {
    const actionItems = [];
    
    const errorCount = issues.filter(issue => issue.severity === 'error').length;
    const warningCount = issues.filter(issue => issue.severity === 'warn').length;
    
    if (errorCount > 0) {
      actionItems.push({
        id: 'fix-errors',
        title: `${errorCount.toString()}個のエラーを修正`,
        detail: 'ESLintおよび型チェックで検出されたエラーを修正してください',
        estimateH: Math.min(errorCount * 0.5, 8)
      });
    }
    
    if (warningCount > 5) {
      actionItems.push({
        id: 'fix-warnings',
        title: `${warningCount.toString()}個の警告を確認・修正`,
        detail: 'コード品質向上のため、警告の内容を確認し必要に応じて修正してください',
        estimateH: Math.min(warningCount * 0.1, 4)
      });
    }
    
    return actionItems;
  }
}