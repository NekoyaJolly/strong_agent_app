// src/agent/workflow/ProjectContext.ts
import { z } from 'zod';
import { ArchitecturePlan, ImplementationResult, ReviewReport, TestReport, DevOpsPlan, DocsUpdate } from '../schemas.js';

export enum WorkflowStage {
  INITIAL = 'initial',
  TRIAGE = 'triage',
  RESEARCH = 'research',
  ARCHITECTURE = 'architecture',
  IMPLEMENTATION = 'implementation',
  TESTING = 'testing',
  REVIEW = 'review',
  DEVOPS = 'devops',
  DOCUMENTATION = 'documentation',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum WorkflowStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REQUIRES_APPROVAL = 'requires_approval'
}

export const WorkflowStep = z.object({
  id: z.string(),
  stage: z.nativeEnum(WorkflowStage),
  status: z.nativeEnum(WorkflowStatus),
  agentName: z.string(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  result: z.any().optional(),
  error: z.string().optional(),
  requiresApproval: z.boolean().default(false),
  approved: z.boolean().optional()
});

export type WorkflowStep = z.infer<typeof WorkflowStep>;

export const ProjectContextSchema = z.object({
  id: z.string(),
  originalRequest: z.string(),
  currentStage: z.nativeEnum(WorkflowStage),
  status: z.nativeEnum(WorkflowStatus),
  
  // ワークフロー管理
  workflow: z.array(WorkflowStep),
  currentStepIndex: z.number().default(0),
  
  // 各段階の結果
  triageResult: z.any().optional(),
  researchResult: z.any().optional(),
  architecturePlan: ArchitecturePlan.optional(),
  implementationResult: ImplementationResult.optional(),
  testReport: TestReport.optional(),
  reviewReport: ReviewReport.optional(),
  devopsPlan: DevOpsPlan.optional(),
  docsUpdate: DocsUpdate.optional(),
  
  // メタデータ
  createdAt: z.date(),
  updatedAt: z.date(),
  
  // エラートラッキング
  errors: z.array(z.object({
    stage: z.nativeEnum(WorkflowStage),
    error: z.string(),
    timestamp: z.date()
  })).default([]),
  
  // PDCA サイクル管理
  iterationCount: z.number().default(0),
  maxIterations: z.number().default(3),
  
  // 共有アーティファクト
  artifacts: z.object({
    generatedFiles: z.array(z.string()).default([]),
    modifiedFiles: z.array(z.string()).default([]),
    testFiles: z.array(z.string()).default([]),
    documentFiles: z.array(z.string()).default([])
  }).default({}),
  
  // ユーザー承認待ち
  pendingApprovals: z.array(z.object({
    stepId: z.string(),
    message: z.string(),
    data: z.any()
  })).default([])
});

export type ProjectContext = z.infer<typeof ProjectContextSchema>;

export class ProjectContextManager {
  constructor(private context: ProjectContext) {}

  static create(originalRequest: string): ProjectContext {
    const now = new Date();
    return {
      id: `project_${Date.now().toString()}`,
      originalRequest,
      currentStage: WorkflowStage.INITIAL,
      status: WorkflowStatus.PENDING,
      workflow: [],
      currentStepIndex: 0,
      createdAt: now,
      updatedAt: now,
      errors: [],
      iterationCount: 0,
      maxIterations: 3,
      artifacts: {
        generatedFiles: [],
        modifiedFiles: [],
        testFiles: [],
        documentFiles: []
      },
      pendingApprovals: []
    };
  }

  getCurrentStep(): WorkflowStep | null {
    return this.context.workflow[this.context.currentStepIndex] || null;
  }

  addWorkflowStep(step: Omit<WorkflowStep, 'id'>): string {
    const stepId = `step_${this.context.workflow.length.toString()}_${Date.now().toString()}`;
    this.context.workflow.push({
      ...step,
      id: stepId
    });
    this.context.updatedAt = new Date();
    return stepId;
  }

  updateStepStatus(stepId: string, status: WorkflowStatus, result?: unknown, error?: string) {
    const step = this.context.workflow.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      if (result) step.result = result;
      if (error) step.error = error;
      if (status === WorkflowStatus.COMPLETED) {
        step.completedAt = new Date();
      }
      this.context.updatedAt = new Date();
    }
  }

  moveToNextStep(): boolean {
    if (this.context.currentStepIndex < this.context.workflow.length - 1) {
      this.context.currentStepIndex++;
      this.context.updatedAt = new Date();
      return true;
    }
    return false;
  }

  addError(stage: WorkflowStage, error: string) {
    this.context.errors.push({
      stage,
      error,
      timestamp: new Date()
    });
    this.context.updatedAt = new Date();
  }

  incrementIteration() {
    this.context.iterationCount++;
    this.context.updatedAt = new Date();
  }

  shouldContinueIterations(): boolean {
    return this.context.iterationCount < this.context.maxIterations;
  }

  addApprovalRequest(stepId: string, message: string, data: unknown) {
    this.context.pendingApprovals.push({
      stepId,
      message,
      data
    });
    this.context.status = WorkflowStatus.REQUIRES_APPROVAL;
    this.context.updatedAt = new Date();
  }

  approveStep(stepId: string) {
    this.context.pendingApprovals = this.context.pendingApprovals.filter(
      approval => approval.stepId !== stepId
    );
    
    const step = this.context.workflow.find(s => s.id === stepId);
    if (step) {
      step.approved = true;
    }
    
    if (this.context.pendingApprovals.length === 0) {
      this.context.status = WorkflowStatus.IN_PROGRESS;
    }
    
    this.context.updatedAt = new Date();
  }

  getContext(): ProjectContext {
    return this.context;
  }

  updateContext(updates: Partial<ProjectContext>) {
    Object.assign(this.context, updates);
    this.context.updatedAt = new Date();
  }
}
