// src/agent/workflow/WorkflowOrchestrator.ts
import { ProjectContext, ProjectContextManager, WorkflowStage, WorkflowStatus } from './ProjectContext.js';
import { triageAgent } from '../triage.js';
import { researcherAgent } from '../researcher.js';
import { architectAgent } from '../architect.js';
import { implementerAgent } from '../implementer.js';
import { testAgent } from '../tester.js';
import { reviewerAgent } from '../reviewer.js';
import { devopsAgent } from '../devops.js';
import { docsAgent } from '../docs.js';
import { logger } from '../../utils/logger.js';
import { SafeAgentRunner, AgentRunResult } from '../../utils/agentRunner.js';

export interface WorkflowConfig {
  maxTurns?: number;
  requireApproval?: boolean;
  maxIterations?: number;
  autoApprove?: boolean;
}

export type ApprovalHandler = (
  stepId: string, 
  message: string, 
  data: any, 
  context: ProjectContext
) => Promise<boolean>;

export class WorkflowOrchestrator {
  private contextManager: ProjectContextManager;
  private config: WorkflowConfig;
  private approvalHandler?: ApprovalHandler;

  constructor(
    context: ProjectContext, 
    config: WorkflowConfig = {}, 
    approvalHandler?: ApprovalHandler
  ) {
    this.contextManager = new ProjectContextManager(context);
    this.config = {
      maxTurns: 10,
      requireApproval: false,
      maxIterations: 3,
      autoApprove: false,
      ...config
    };
    this.approvalHandler = approvalHandler;
  }

  static async createWorkflow(
    originalRequest: string, 
    config?: WorkflowConfig, 
    approvalHandler?: ApprovalHandler
  ): Promise<WorkflowOrchestrator> {
    const context = ProjectContextManager.create(originalRequest);
    return new WorkflowOrchestrator(context, config, approvalHandler);
  }

  private async executeAgent(agent: any, input: string, stepId: string): Promise<AgentRunResult> {
    logger.info(`Executing ${agent.name} for step ${stepId}`);
    
    try {
      // Phase 1: 新しいSafeAgentRunnerを使用してエージェントを実行
      const result = await SafeAgentRunner.runAgentWithRetry(agent, input, {
        maxTurns: this.config.maxTurns,
        timeout: 120000, // 2分タイムアウト
        retries: 2
      });

      if (result.success) {
        logger.info(`✅ ${agent.name} completed successfully for step ${stepId}`, {
          duration: result.metadata?.duration
        });
      } else {
        logger.error(`❌ ${agent.name} failed for step ${stepId}: ${result.error}`, new Error(result.error || 'Unknown error'));
      }

      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`🚨 Unexpected error in ${agent.name}:`, new Error(errorMessage));
      
      return {
        success: false,
        error: errorMessage,
        metadata: { errorType: 'UnexpectedError' },
        recoverable: false
      };
    }
  }

  private async requestApproval(stepId: string, message: string, data: any): Promise<boolean> {
    if (this.config.autoApprove) {
      logger.info(`Auto-approving step: ${stepId}`);
      return true;
    }

    if (!this.approvalHandler) {
      logger.warn(`No approval handler configured, auto-approving step: ${stepId}`);
      return true;
    }

    return await this.approvalHandler(stepId, message, data, this.contextManager.getContext());
  }

  async executeWorkflow(): Promise<ProjectContext> {
    try {
      await this.initializeWorkflow();
      
      while (this.hasMoreSteps() && this.contextManager.shouldContinueIterations()) {
        const currentStep = this.contextManager.getCurrentStep();
        if (!currentStep) break;

        logger.info(`Executing workflow step: ${currentStep.stage} (${currentStep.id})`);

        try {
          await this.executeCurrentStep();
          
          // 承認が必要な場合はチェック
          if (currentStep.requiresApproval && !currentStep.approved) {
            const approved = await this.requestApproval(
              currentStep.id,
              `Please approve ${currentStep.stage} stage`,
              currentStep.result
            );
            
            if (!approved) {
              this.contextManager.updateStepStatus(
                currentStep.id, 
                WorkflowStatus.FAILED, 
                undefined, 
                'User approval declined'
              );
              break;
            }
            
            this.contextManager.approveStep(currentStep.id);
          }

          // テストやレビューで問題が見つかった場合のPDCAループ
          if (await this.shouldIterateBasedOnResults()) {
            await this.handleIterationLoop();
            continue;
          }

          this.contextManager.moveToNextStep();
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.contextManager.updateStepStatus(
            currentStep.id, 
            WorkflowStatus.FAILED, 
            undefined, 
            errorMessage
          );
          this.contextManager.addError(currentStep.stage, errorMessage);
          
          // 重大なエラーの場合は停止、軽微なエラーの場合は継続
          if (this.isCriticalError(error)) {
            break;
          }
        }
      }

      // ワークフロー完了処理
      await this.finalizeWorkflow();
      
      return this.contextManager.getContext();
      
    } catch (error) {
      logger.error('Workflow execution failed:', error instanceof Error ? error : new Error(String(error)));
      this.contextManager.updateContext({
        status: WorkflowStatus.FAILED,
        currentStage: WorkflowStage.FAILED
      });
      throw error;
    }
  }

  private async initializeWorkflow(): Promise<void> {
    // ワークフロー定義
    const workflowSteps = [
      { stage: WorkflowStage.TRIAGE, agentName: 'Triage', requiresApproval: false },
      { stage: WorkflowStage.RESEARCH, agentName: 'Researcher', requiresApproval: false },
      { stage: WorkflowStage.ARCHITECTURE, agentName: 'Architect', requiresApproval: this.config.requireApproval },
      { stage: WorkflowStage.IMPLEMENTATION, agentName: 'Implementer', requiresApproval: false },
      { stage: WorkflowStage.TESTING, agentName: 'Tester', requiresApproval: false },
      { stage: WorkflowStage.REVIEW, agentName: 'Reviewer', requiresApproval: false },
      { stage: WorkflowStage.DEVOPS, agentName: 'DevOps', requiresApproval: this.config.requireApproval },
      { stage: WorkflowStage.DOCUMENTATION, agentName: 'Docs', requiresApproval: false }
    ];

    workflowSteps.forEach(step => {
      this.contextManager.addWorkflowStep({
        stage: step.stage,
        status: WorkflowStatus.PENDING,
        agentName: step.agentName,
        requiresApproval: step.requiresApproval || false
      });
    });

    this.contextManager.updateContext({
      currentStage: WorkflowStage.TRIAGE,
      status: WorkflowStatus.IN_PROGRESS
    });
  }

  private async executeCurrentStep(): Promise<void> {
    const currentStep = this.contextManager.getCurrentStep();
    if (!currentStep) return;

    currentStep.status = WorkflowStatus.IN_PROGRESS;
    currentStep.startedAt = new Date();

    const context = this.contextManager.getContext();
    let input = this.buildInputForStage(currentStep.stage, context);
    let agentResult: AgentRunResult = { success: false, error: 'Unknown error' }; // 初期化

    switch (currentStep.stage) {
      case WorkflowStage.TRIAGE:
        agentResult = await this.executeAgent(triageAgent, input, currentStep.id);
        if (agentResult.success) {
          this.contextManager.updateContext({ triageResult: agentResult.data });
        }
        break;
        
      case WorkflowStage.RESEARCH:
        agentResult = await this.executeAgent(researcherAgent, input, currentStep.id);
        if (agentResult.success) {
          this.contextManager.updateContext({ researchResult: agentResult.data });
        }
        break;
        
      case WorkflowStage.ARCHITECTURE:
        agentResult = await this.executeAgent(architectAgent, input, currentStep.id);
        if (agentResult.success) {
          this.contextManager.updateContext({ architecturePlan: agentResult.data });
        }
        break;
        
      case WorkflowStage.IMPLEMENTATION:
        agentResult = await this.executeAgent(implementerAgent, input, currentStep.id);
        if (agentResult.success) {
          this.contextManager.updateContext({ implementationResult: agentResult.data });
        }
        break;
        
      case WorkflowStage.TESTING:
        agentResult = await this.executeAgent(testAgent, input, currentStep.id);
        if (agentResult.success) {
          this.contextManager.updateContext({ testReport: agentResult.data });
        }
        break;
        
      case WorkflowStage.REVIEW:
        agentResult = await this.executeAgent(reviewerAgent, input, currentStep.id);
        if (agentResult.success) {
          this.contextManager.updateContext({ reviewReport: agentResult.data });
        }
        break;
        
      case WorkflowStage.DEVOPS:
        agentResult = await this.executeAgent(devopsAgent, input, currentStep.id);
        if (agentResult.success) {
          this.contextManager.updateContext({ devopsPlan: agentResult.data });
        }
        break;
        
      case WorkflowStage.DOCUMENTATION:
        agentResult = await this.executeAgent(docsAgent, input, currentStep.id);
        if (agentResult.success) {
          this.contextManager.updateContext({ docsUpdate: agentResult.data });
        }
        break;
    }

    // ステップ状態の更新（失敗の場合も考慮）
    if (agentResult.success) {
      this.contextManager.updateStepStatus(
        currentStep.id, 
        WorkflowStatus.COMPLETED, 
        agentResult.data
      );
    } else {
      this.contextManager.updateStepStatus(
        currentStep.id, 
        WorkflowStatus.FAILED, 
        undefined,
        agentResult.error
      );
      
      // 回復可能なエラーの場合は警告、そうでなければ致命的エラーとして扱う
      if (!agentResult.recoverable) {
        throw new Error(`Critical error in ${currentStep.stage}: ${agentResult.error}`);
      }
    }
  }

  private buildInputForStage(stage: WorkflowStage, context: ProjectContext): string {
    const baseRequest = context.originalRequest;
    
    switch (stage) {
      case WorkflowStage.TRIAGE:
        return baseRequest;
        
      case WorkflowStage.RESEARCH:
        return `
元の要求: ${baseRequest}

Triageの結果: ${JSON.stringify(context.triageResult, null, 2)}

上記の要求について、技術的実現可能性、既存ソリューション、ベストプラクティス、潜在的リスクについて徹底的に調査してください。
`;
        
      case WorkflowStage.ARCHITECTURE:
        return `
元の要求: ${baseRequest}

Triageの結果: ${JSON.stringify(context.triageResult, null, 2)}

リサーチ結果: ${JSON.stringify(context.researchResult, null, 2)}

上記の情報を基に、アプリケーションのアーキテクチャ設計を作成してください。
`;
        
      case WorkflowStage.IMPLEMENTATION:
        return `
アーキテクチャプラン: ${JSON.stringify(context.architecturePlan, null, 2)}

リサーチ結果: ${JSON.stringify(context.researchResult, null, 2)}

上記の設計に基づいて実装を行ってください。
`;
        
      case WorkflowStage.TESTING:
        return `
実装結果: ${JSON.stringify(context.implementationResult, null, 2)}

上記の実装に対してテストを作成・実行してください。
`;
        
      case WorkflowStage.REVIEW:
        return `
実装結果: ${JSON.stringify(context.implementationResult, null, 2)}

テスト結果: ${JSON.stringify(context.testReport, null, 2)}

上記の実装とテストをレビューしてください。
`;
        
      case WorkflowStage.DEVOPS:
        return `
実装結果: ${JSON.stringify(context.implementationResult, null, 2)}

レビュー結果: ${JSON.stringify(context.reviewReport, null, 2)}

デプロイメントプランを作成してください。
`;
        
      case WorkflowStage.DOCUMENTATION:
        return `
プロジェクト全体の結果:
- アーキテクチャ: ${JSON.stringify(context.architecturePlan, null, 2)}
- 実装: ${JSON.stringify(context.implementationResult, null, 2)}
- テスト: ${JSON.stringify(context.testReport, null, 2)}
- デプロイ: ${JSON.stringify(context.devopsPlan, null, 2)}

ドキュメントを更新してください。
`;
        
      default:
        return baseRequest;
    }
  }

  private async shouldIterateBasedOnResults(): Promise<boolean> {
    const context = this.contextManager.getContext();
    
    // テストが失敗した場合
    if (context.testReport && context.testReport.failed > 0) {
      return true;
    }
    
    // レビューでエラーが見つかった場合
    if (context.reviewReport && 
        context.reviewReport.issues.some(issue => issue.severity === 'error')) {
      return true;
    }
    
    return false;
  }

  private async handleIterationLoop(): Promise<void> {
    if (!this.contextManager.shouldContinueIterations()) {
      logger.warn('Maximum iterations reached, stopping iteration loop');
      return;
    }

    this.contextManager.incrementIteration();
    logger.info(`Starting iteration ${this.contextManager.getContext().iterationCount}`);
    
    // 実装段階に戻る（問題修正のため）
    const implementationStepIndex = this.contextManager.getContext().workflow
      .findIndex(step => step.stage === WorkflowStage.IMPLEMENTATION);
    
    if (implementationStepIndex >= 0) {
      this.contextManager.updateContext({ 
        currentStepIndex: implementationStepIndex 
      });
    }
  }

  private hasMoreSteps(): boolean {
    const context = this.contextManager.getContext();
    return context.currentStepIndex < context.workflow.length;
  }

  private isCriticalError(error: any): boolean {
    // エラーの種類に基づいて継続可能かどうかを判定
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    const criticalPatterns = [
      /authentication failed/i,
      /permission denied/i,
      /file system error/i,
      /network connection failed/i
    ];
    
    return criticalPatterns.some(pattern => pattern.test(errorMessage));
  }

  private async finalizeWorkflow(): Promise<void> {
    const context = this.contextManager.getContext();
    
    if (context.workflow.every(step => step.status === WorkflowStatus.COMPLETED)) {
      this.contextManager.updateContext({
        status: WorkflowStatus.COMPLETED,
        currentStage: WorkflowStage.COMPLETED
      });
      logger.info('Workflow completed successfully');
    } else {
      logger.warn('Workflow completed with some failed steps');
    }
  }

  getContext(): ProjectContext {
    return this.contextManager.getContext();
  }
}
