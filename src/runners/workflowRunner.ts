// src/runners/workflowRunner.ts
import type { WorkflowConfig, ApprovalHandler } from '../agent/workflow/WorkflowOrchestrator.js';
import { WorkflowOrchestrator } from '../agent/workflow/WorkflowOrchestrator.js';
import type { ProjectContext, WorkflowStage } from '../agent/workflow/ProjectContext.js';
import { getConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export interface WorkflowRunnerOptions {
  project?: string;
  maxIterations?: number;
  requireApproval?: boolean;
  autoApprove?: boolean;
  onApprovalRequired?: ApprovalHandler;
  onStageComplete?: (stage: WorkflowStage, result: any) => Promise<void>;
  onWorkflowComplete?: (context: ProjectContext) => Promise<void>;
}

export class WorkflowRunner {
  private orchestrator?: WorkflowOrchestrator;
  private options: WorkflowRunnerOptions;

  constructor(options: WorkflowRunnerOptions = {}) {
    this.options = options;
  }

  async executeWorkflow(request: string): Promise<ProjectContext> {
    try {
      logger.info('Starting workflow execution', { request, options: this.options });

      // 設定の読み込み
      const config = this.options.project ? await getConfig(this.options.project) : undefined;
      
      // ワークフロー設定の構築
      const workflowConfig: WorkflowConfig = {
        maxTurns: config?.env.maxTurns || 10,
        requireApproval: this.options.requireApproval || false,
        maxIterations: this.options.maxIterations || 3,
        autoApprove: this.options.autoApprove || false
      };

      // 承認ハンドラーの設定
      const approvalHandler: ApprovalHandler = async (stepId, message, data, context) => {
        if (this.options.onApprovalRequired) {
          return await this.options.onApprovalRequired(stepId, message, data, context);
        }
        
        // デフォルトの承認処理（コンソール出力）
        console.log(`\n=== APPROVAL REQUIRED ===`);
        console.log(`Step: ${stepId}`);
        console.log(`Message: ${message}`);
        console.log(`Data:`, JSON.stringify(data, null, 2));
        console.log(`========================\n`);
        
        // 自動承認またはユーザー入力待ち
        if (workflowConfig.autoApprove) {
          return true;
        }
        
        // TODO: 実際のプロダクトではここでユーザー入力を待つ
        return true; // 暫定的に承認
      };

      // オーケストレーターの作成
      this.orchestrator = await WorkflowOrchestrator.createWorkflow(
        request,
        workflowConfig,
        approvalHandler
      );

      // 段階完了コールバックの設定
      if (this.options.onStageComplete) {
        // オーケストレーターに段階完了リスナーを追加する機能があれば使用
        // 現在の実装では直接的な方法がないため、定期的にチェックする仕組みが必要
      }

      // ワークフローの実行
      const result = await this.orchestrator.executeWorkflow();

      // 完了コールバックの実行
      if (this.options.onWorkflowComplete) {
        await this.options.onWorkflowComplete(result);
      }

      logger.info('Workflow execution completed', { 
        status: result.status,
        stage: result.currentStage,
        iterations: result.iterationCount 
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Workflow execution failed:', error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }

  async getProgress(): Promise<ProjectContext | null> {
    return this.orchestrator?.getContext() || null;
  }

  // 既存のCLIランナーとの互換性を保つためのヘルパーメソッド
  static async runFromCLI(options: {
    project: string;
    task: string;
    requireApproval?: boolean;
    maxIterations?: number;
  }): Promise<ProjectContext> {
    const runner = new WorkflowRunner({
      project: options.project,
      requireApproval: options.requireApproval || false,
      maxIterations: options.maxIterations || 3,
      onStageComplete: async (stage, result) => {
        console.log(`\n=== ${stage.toUpperCase()} COMPLETED ===`);
        console.log(JSON.stringify(result, null, 2));
        console.log('================================\n');
      },
      onWorkflowComplete: async (context) => {
        console.log('\n=== WORKFLOW COMPLETED ===');
        console.log('Final Status:', context.status);
        console.log('Generated Files:', context.artifacts.generatedFiles);
        console.log('Modified Files:', context.artifacts.modifiedFiles);
        console.log('Iterations:', context.iterationCount);
        if (context.errors.length > 0) {
          console.log('Errors encountered:');
          context.errors.forEach(error => {
            console.log(`  - ${error.stage}: ${error.error}`);
          });
        }
        console.log('===========================\n');
      }
    });

    return await runner.executeWorkflow(options.task);
  }
}

// CLIからの使用例
export async function cliWorkflowRunner(options: { 
  project: string; 
  task: string;
  requireApproval?: boolean;
  maxIterations?: number;
}): Promise<void> {
  try {
    await WorkflowRunner.runFromCLI(options);
  } catch (error) {
    logger.error('CLI workflow runner failed:', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}
