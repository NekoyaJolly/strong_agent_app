// tests/workflow/workflow-unit.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { 
  ProjectContext} from '../../src/agent/workflow/ProjectContext.js';
import { 
  ProjectContextManager, 
  WorkflowStage, 
  WorkflowStatus 
} from '../../src/agent/workflow/ProjectContext.js';
import { 
  ArchitecturePlan, 
  ImplementationResult, 
  ReviewReport, 
  TestReport, 
  DevOpsPlan, 
  DocsUpdate,
  ResearchResult 
} from '../../src/agent/schemas.js';

describe('Agent Workflow Unit Tests', () => {
  let mockContext: ProjectContext;
  let contextManager: ProjectContextManager;

  beforeEach(() => {
    // Create fresh context for each test
    mockContext = ProjectContextManager.create('Test project request');
    contextManager = new ProjectContextManager(mockContext);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('ProjectContext Management', () => {
    it('should create valid project context', () => {
      const context = ProjectContextManager.create('Test request');
      
      expect(context.id).toMatch(/^project_\d+$/);
      expect(context.originalRequest).toBe('Test request');
      expect(context.currentStage).toBe(WorkflowStage.INITIAL);
      expect(context.status).toBe(WorkflowStatus.PENDING);
      expect(context.workflow).toEqual([]);
      expect(context.currentStepIndex).toBe(0);
      expect(context.iterationCount).toBe(0);
      expect(context.maxIterations).toBe(3);
    });

    it('should add workflow steps correctly', () => {
      const stepId = contextManager.addWorkflowStep({
        stage: WorkflowStage.TRIAGE,
        status: WorkflowStatus.PENDING,
        agentName: 'Triage',
        requiresApproval: false
      });

      expect(stepId).toMatch(/^step_\d+_\d+$/);
      expect(contextManager.getContext().workflow).toHaveLength(1);
      
      const step = contextManager.getCurrentStep();
      expect(step?.stage).toBe(WorkflowStage.TRIAGE);
      expect(step?.agentName).toBe('Triage');
    });

    it('should update step status correctly', () => {
      const stepId = contextManager.addWorkflowStep({
        stage: WorkflowStage.TRIAGE,
        status: WorkflowStatus.PENDING,
        agentName: 'Triage',
        requiresApproval: false
      });

      const mockResult = { memo: 'Triage completed' };
      contextManager.updateStepStatus(stepId, WorkflowStatus.COMPLETED, mockResult);
      
      const step = contextManager.getCurrentStep();
      expect(step?.status).toBe(WorkflowStatus.COMPLETED);
      expect(step?.result).toEqual(mockResult);
      expect(step?.completedAt).toBeDefined();
    });

    it('should handle approval workflow correctly', () => {
      const stepId = contextManager.addWorkflowStep({
        stage: WorkflowStage.ARCHITECTURE,
        status: WorkflowStatus.PENDING,
        agentName: 'Architect',
        requiresApproval: true
      });

      contextManager.addApprovalRequest(stepId, 'Please approve architecture', {});
      
      expect(contextManager.getContext().status).toBe(WorkflowStatus.REQUIRES_APPROVAL);
      expect(contextManager.getContext().pendingApprovals).toHaveLength(1);
      
      contextManager.approveStep(stepId);
      
      expect(contextManager.getContext().status).toBe(WorkflowStatus.IN_PROGRESS);
      expect(contextManager.getContext().pendingApprovals).toHaveLength(0);
      
      const step = contextManager.getCurrentStep();
      expect(step?.approved).toBe(true);
    });

    it('should track errors correctly', () => {
      contextManager.addError(WorkflowStage.IMPLEMENTATION, 'Compilation failed');
      
      const errors = contextManager.getContext().errors;
      expect(errors).toHaveLength(1);
      expect(errors[0].stage).toBe(WorkflowStage.IMPLEMENTATION);
      expect(errors[0].error).toBe('Compilation failed');
      expect(errors[0].timestamp).toBeDefined();
    });

    it('should handle iteration management', () => {
      expect(contextManager.shouldContinueIterations()).toBe(true);
      
      contextManager.incrementIteration();
      expect(contextManager.getContext().iterationCount).toBe(1);
      
      contextManager.incrementIteration();
      contextManager.incrementIteration();
      expect(contextManager.getContext().iterationCount).toBe(3);
      expect(contextManager.shouldContinueIterations()).toBe(false);
    });

    it('should move to next step correctly', () => {
      // Add multiple steps
      const stepId1 = contextManager.addWorkflowStep({
        stage: WorkflowStage.TRIAGE,
        status: WorkflowStatus.COMPLETED,
        agentName: 'Triage',
        requiresApproval: false
      });

      const stepId2 = contextManager.addWorkflowStep({
        stage: WorkflowStage.ARCHITECTURE,
        status: WorkflowStatus.PENDING,
        agentName: 'Architect',
        requiresApproval: false
      });

      // Should start at first step
      expect(contextManager.getCurrentStep()?.id).toBe(stepId1);
      
      // Move to next step
      expect(contextManager.moveToNextStep()).toBe(true);
      expect(contextManager.getCurrentStep()?.id).toBe(stepId2);
      
      // No more steps
      expect(contextManager.moveToNextStep()).toBe(false);
    });

    it('should maintain artifacts across workflow stages', () => {
      // Add some initial artifacts
      contextManager.updateContext({
        artifacts: {
          generatedFiles: ['src/initial.ts'],
          modifiedFiles: ['package.json'],
          testFiles: ['tests/setup.ts'],
          documentFiles: ['README.md']
        }
      });

      const context = contextManager.getContext();
      expect(context.artifacts.generatedFiles).toContain('src/initial.ts');
      expect(context.artifacts.modifiedFiles).toContain('package.json');
      expect(context.artifacts.testFiles).toContain('tests/setup.ts');
      expect(context.artifacts.documentFiles).toContain('README.md');
    });
  });

  describe('Schema Validation', () => {
    it('should validate ArchitecturePlan schema', () => {
      const validPlan: ArchitecturePlan = {
        projectName: 'Test Project',
        stack: ['TypeScript', 'Node.js'],
        services: ['API', 'Frontend'],
        directories: ['src/', 'tests/', 'docs/'],
        envVars: ['DATABASE_URL', 'API_KEY'],
        decisions: ['Use TypeScript for type safety'],
        risks: ['Database migration complexity'],
        initialBacklog: []
      };

      const result = ArchitecturePlan.safeParse(validPlan);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.projectName).toBe('Test Project');
        expect(result.data.stack).toContain('TypeScript');
      }
    });

    it('should validate ImplementationResult schema', () => {
      const validResult: ImplementationResult = {
        summary: 'Implementation completed successfully',
        createdFiles: ['src/newFile.ts'],
        modifiedFiles: ['src/existingFile.ts'],
        commandsToRun: ['npm install', 'npm build'],
        notes: 'All tests passing'
      };

      const result = ImplementationResult.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate TestReport schema', () => {
      const validReport: TestReport = {
        passed: 15,
        failed: 2,
        newTests: ['userService.test.ts', 'authMiddleware.test.ts'],
        coverageNote: 'Coverage increased to 85%'
      };

      const result = TestReport.safeParse(validReport);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.passed).toBe(15);
        expect(result.data.failed).toBe(2);
      }
    });

    it('should validate ReviewReport schema', () => {
      const validReport: ReviewReport = {
        summary: 'Code review completed with minor issues',
        issues: [
          {
            kind: 'style',
            path: 'src/utils.ts',
            message: 'Consider using const instead of let',
            severity: 'warn'
          },
          {
            kind: 'logic',
            path: 'src/main.ts',
            message: 'Potential null pointer exception',
            severity: 'error'
          }
        ],
        score: 75,
        actionItems: [
          {
            id: 'fix-1',
            title: 'Fix null pointer issue',
            detail: 'Add null checks in main.ts',
            estimateH: 1
          }
        ]
      };

      const result = ReviewReport.safeParse(validReport);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.score).toBe(75);
        expect(result.data.issues).toHaveLength(2);
        expect(result.data.issues[1].severity).toBe('error');
      }
    });

    it('should validate ResearchResult schema', () => {
      const validResult: ResearchResult = {
        summary: 'Research on modern web frameworks completed',
        findings: [
          {
            topic: 'React 18 Features',
            information: 'Concurrent rendering and automatic batching',
            sources: ['react.dev', 'github.com/facebook/react'],
            relevanceScore: 9
          }
        ],
        recommendations: ['Consider upgrading to React 18'],
        technicalConsiderations: ['Breaking changes in concurrent features'],
        potentialChallenges: ['Migration complexity'],
        bestPractices: ['Use strict mode', 'Implement error boundaries'],
        references: [
          {
            title: 'React 18 Release Notes',
            url: 'https://react.dev/blog/2022/03/29/react-v18',
            summary: 'Official release notes for React 18'
          }
        ]
      };

      const result = ResearchResult.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate DevOpsPlan schema', () => {
      const validPlan: DevOpsPlan = {
        dockerized: true,
        artifacts: ['dist/', 'docker/'],
        previewUrl: 'https://preview.example.com',
        rollback: ['docker rollback app:previous']
      };

      const result = DevOpsPlan.safeParse(validPlan);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dockerized).toBe(true);
        expect(result.data.previewUrl).toBe('https://preview.example.com');
      }
    });

    it('should validate DocsUpdate schema', () => {
      const validUpdate: DocsUpdate = {
        readmeUpdated: true,
        files: ['README.md', 'CHANGELOG.md'],
        changelogEntry: 'Added new features and bug fixes'
      };

      const result = DocsUpdate.safeParse(validUpdate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.readmeUpdated).toBe(true);
        expect(result.data.files).toContain('README.md');
      }
    });

    it('should reject invalid schema data', () => {
      const invalidPlan = {
        projectName: 123, // Should be string
        stack: 'not-array', // Should be array
        services: ['valid'], // Valid
        directories: [], // Valid but empty
        envVars: [], // Valid
        decisions: [], // Valid
        risks: [] // Valid
      };

      const result = ArchitecturePlan.safeParse(invalidPlan);
      expect(result.success).toBe(false);
    });
  });

  describe('Workflow Stage Transitions', () => {
    it('should track workflow stage progression', () => {
      const stages = [
        WorkflowStage.TRIAGE,
        WorkflowStage.RESEARCH,
        WorkflowStage.ARCHITECTURE,
        WorkflowStage.IMPLEMENTATION,
        WorkflowStage.TESTING,
        WorkflowStage.REVIEW,
        WorkflowStage.DEVOPS,
        WorkflowStage.DOCUMENTATION,
        WorkflowStage.COMPLETED
      ];

      // Add all workflow steps
      stages.forEach((stage, index) => {
        contextManager.addWorkflowStep({
          stage,
          status: WorkflowStatus.PENDING,
          agentName: stage.charAt(0).toUpperCase() + stage.slice(1),
          requiresApproval: false
        });

        // Complete current step
        const currentStep = contextManager.getCurrentStep();
        if (currentStep) {
          contextManager.updateStepStatus(
            currentStep.id, 
            WorkflowStatus.COMPLETED,
            { result: `${stage} completed` }
          );
        }

        // Move to next step (except for last one)
        if (index < stages.length - 1) {
          contextManager.moveToNextStep();
        }
      });

      const context = contextManager.getContext();
      expect(context.workflow).toHaveLength(stages.length);
      expect(context.workflow.every(step => step.status === WorkflowStatus.COMPLETED)).toBe(true);
    });

    it('should handle workflow failures correctly', () => {
      // Add a few steps
      const _stepId1 = contextManager.addWorkflowStep({
        stage: WorkflowStage.TRIAGE,
        status: WorkflowStatus.COMPLETED,
        agentName: 'Triage',
        requiresApproval: false
      });

      const stepId2 = contextManager.addWorkflowStep({
        stage: WorkflowStage.IMPLEMENTATION,
        status: WorkflowStatus.PENDING,
        agentName: 'Implementer',
        requiresApproval: false
      });

      // Move to implementation step
      contextManager.moveToNextStep();
      
      // Fail implementation step
      contextManager.updateStepStatus(
        stepId2,
        WorkflowStatus.FAILED,
        undefined,
        'Build compilation failed'
      );

      contextManager.addError(WorkflowStage.IMPLEMENTATION, 'Build compilation failed');

      const context = contextManager.getContext();
      expect(context.errors).toHaveLength(1);
      expect(context.errors[0].error).toBe('Build compilation failed');
      
      const failedStep = context.workflow.find(step => step.id === stepId2);
      expect(failedStep?.status).toBe(WorkflowStatus.FAILED);
      expect(failedStep?.error).toBe('Build compilation failed');
    });

    it('should support multiple approval requests', () => {
      const archStepId = contextManager.addWorkflowStep({
        stage: WorkflowStage.ARCHITECTURE,
        status: WorkflowStatus.PENDING,
        agentName: 'Architect',
        requiresApproval: true
      });

      const devopsStepId = contextManager.addWorkflowStep({
        stage: WorkflowStage.DEVOPS,
        status: WorkflowStatus.PENDING,
        agentName: 'DevOps',
        requiresApproval: true
      });

      // Add approval requests for both steps
      contextManager.addApprovalRequest(archStepId, 'Please approve architecture', { plan: 'arch-plan' });
      contextManager.addApprovalRequest(devopsStepId, 'Please approve deployment', { deployment: 'plan' });

      expect(contextManager.getContext().pendingApprovals).toHaveLength(2);
      expect(contextManager.getContext().status).toBe(WorkflowStatus.REQUIRES_APPROVAL);

      // Approve architecture step
      contextManager.approveStep(archStepId);
      expect(contextManager.getContext().pendingApprovals).toHaveLength(1);
      expect(contextManager.getContext().status).toBe(WorkflowStatus.REQUIRES_APPROVAL); // Still needs DevOps approval

      // Approve DevOps step  
      contextManager.approveStep(devopsStepId);
      expect(contextManager.getContext().pendingApprovals).toHaveLength(0);
      expect(contextManager.getContext().status).toBe(WorkflowStatus.IN_PROGRESS);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle workflow with no steps', () => {
      const emptyContext = ProjectContextManager.create('Empty test');
      const emptyManager = new ProjectContextManager(emptyContext);
      
      expect(emptyManager.getCurrentStep()).toBeNull();
      expect(emptyManager.moveToNextStep()).toBe(false);
    });

    it('should handle concurrent step execution edge cases', () => {
      // Test moving to next step when already at the end
      contextManager.addWorkflowStep({
        stage: WorkflowStage.COMPLETED,
        status: WorkflowStatus.COMPLETED,
        agentName: 'Final',
        requiresApproval: false
      });

      expect(contextManager.moveToNextStep()).toBe(false);
      expect(contextManager.getCurrentStep()?.stage).toBe(WorkflowStage.COMPLETED);
    });

    it('should handle invalid step IDs gracefully', () => {
      contextManager.updateStepStatus('invalid-step-id', WorkflowStatus.COMPLETED);
      
      // Should not throw error, just ignore invalid ID
      expect(contextManager.getContext().workflow).toHaveLength(0);
    });

    it('should handle large number of workflow steps', () => {
      const maxSteps = 100;
      
      // Add many steps
      for (let i = 0; i < maxSteps; i++) {
        contextManager.addWorkflowStep({
          stage: WorkflowStage.IMPLEMENTATION,
          status: WorkflowStatus.PENDING,
          agentName: `Agent${i.toString()}`,
          requiresApproval: false
        });
      }

      expect(contextManager.getContext().workflow).toHaveLength(maxSteps);
      
      // Should be able to navigate through all steps
      let stepCount = 0;
      while (contextManager.moveToNextStep()) {
        stepCount++;
      }
      
      expect(stepCount).toBe(maxSteps - 1); // -1 because starts at first step
    });

    it('should validate context updates', () => {
      const originalContext = { ...contextManager.getContext() };
      
      // Update with partial context
      contextManager.updateContext({
        status: WorkflowStatus.COMPLETED,
        currentStage: WorkflowStage.COMPLETED
      });

      const updatedContext = contextManager.getContext();
      expect(updatedContext.status).toBe(WorkflowStatus.COMPLETED);
      expect(updatedContext.currentStage).toBe(WorkflowStage.COMPLETED);
      expect(updatedContext.id).toBe(originalContext.id); // Should preserve original properties
      expect(updatedContext.originalRequest).toBe(originalContext.originalRequest);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle memory-intensive operations', () => {
      // Add large amounts of data to context
      const largeData = {
        architecturePlan: {
          projectName: 'Large Project',
          stack: Array(1000).fill('technology'),
          services: Array(500).fill('service'),
          directories: Array(100).fill('dir/'),
          envVars: Array(50).fill('VAR'),
          decisions: Array(200).fill('decision'),
          risks: Array(100).fill('risk'),
          initialBacklog: Array(1000).fill(null).map((_, i) => ({
            id: `task-${i.toString()}`,
            title: `Task ${i.toString()}`,
            detail: 'Large task description with lots of text'.repeat(10),
            estimateH: i % 10
          }))
        }
      };

      contextManager.updateContext(largeData);
      
      const context = contextManager.getContext();
      expect(context.architecturePlan?.stack).toHaveLength(1000);
      expect(context.architecturePlan?.initialBacklog).toHaveLength(1000);
    });

    it('should maintain performance with many errors', () => {
      const errorCount = 1000;
      
      for (let i = 0; i < errorCount; i++) {
        contextManager.addError(
          WorkflowStage.IMPLEMENTATION, 
          `Error ${i.toString()}: Performance test error with detailed message`
        );
      }

      const context = contextManager.getContext();
      expect(context.errors).toHaveLength(errorCount);
      expect(context.errors[0].error).toContain('Error 0');
      expect(context.errors[errorCount - 1].error).toContain(`Error ${(errorCount - 1).toString()}`);
    });
  });
});
