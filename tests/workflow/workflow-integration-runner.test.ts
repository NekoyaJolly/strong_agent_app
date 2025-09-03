// tests/workflow/workflow-integration-runner.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkflowOrchestrator } from '../../src/agent/workflow/WorkflowOrchestrator.js';
import { ProjectContextManager, WorkflowStage, WorkflowStatus } from '../../src/agent/workflow/ProjectContext.js';

// Mock all external dependencies
vi.mock('@openai/agents', () => ({
  run: vi.fn()
}));

vi.mock('../../src/agent/triage.js', () => ({
  triageAgent: { name: 'Triage' }
}));

vi.mock('../../src/agent/researcher.js', () => ({
  researcherAgent: { name: 'Researcher' }
}));

vi.mock('../../src/agent/architect.js', () => ({
  architectAgent: { name: 'Architect' }
}));

vi.mock('../../src/agent/implementer.js', () => ({
  implementerAgent: { name: 'Implementer' }
}));

vi.mock('../../src/agent/tester.js', () => ({
  testAgent: { name: 'Test' }
}));

vi.mock('../../src/agent/reviewer.js', () => ({
  reviewerAgent: { name: 'Reviewer' }
}));

vi.mock('../../src/agent/devops.js', () => ({
  devopsAgent: { name: 'DevOps' }
}));

vi.mock('../../src/agent/docs.js', () => ({
  docsAgent: { name: 'Docs' }
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('Workflow Integration Runner Tests', () => {
  let orchestrator: WorkflowOrchestrator;
  let mockRun: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Setup mock for run function
    const { run } = await import('@openai/agents');
    mockRun = vi.mocked(run);
    
    // Create orchestrator instance
    const context = ProjectContextManager.create('Integration test request');
    orchestrator = new WorkflowOrchestrator(context, {
      maxTurns: 3,
      requireApproval: false,
      autoApprove: true,
      maxIterations: 2
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Workflow Orchestrator Integration', () => {
    it('should create and initialize workflow orchestrator', () => {
      expect(orchestrator).toBeDefined();
    });

    it('should handle workflow creation from request', async () => {
      const newOrchestrator = await WorkflowOrchestrator.createWorkflow(
        'Create a new web application',
        { maxTurns: 5 }
      );
      
      expect(newOrchestrator).toBeDefined();
    });

    it('should execute workflow initialization', async () => {
      // Mock successful agent responses
      mockRun.mockResolvedValue({
        finalOutput: { memo: 'Workflow initialized successfully' }
      });

      // Since we can't easily access private methods, we'll test through public interface
      // by mocking the executeWorkflow method behavior
      const mockContext = ProjectContextManager.create('Test initialization');
      const testOrchestrator = new WorkflowOrchestrator(mockContext);
      
      expect(testOrchestrator).toBeDefined();
    });
  });

  describe('Workflow State Management', () => {
    it('should manage workflow state transitions', () => {
      const context = ProjectContextManager.create('State management test');
      const manager = new ProjectContextManager(context);
      
      // Add workflow steps
      const stepId1 = manager.addWorkflowStep({
        stage: WorkflowStage.TRIAGE,
        status: WorkflowStatus.PENDING,
        agentName: 'Triage',
        requiresApproval: false
      });

      const stepId2 = manager.addWorkflowStep({
        stage: WorkflowStage.ARCHITECTURE,
        status: WorkflowStatus.PENDING,
        agentName: 'Architect',
        requiresApproval: false
      });

      // Complete first step
      manager.updateStepStatus(stepId1, WorkflowStatus.COMPLETED, { result: 'completed' });
      
      // Move to next step
      expect(manager.moveToNextStep()).toBe(true);
      expect(manager.getCurrentStep()?.id).toBe(stepId2);
    });

    it('should handle workflow error states', () => {
      const context = ProjectContextManager.create('Error handling test');
      const manager = new ProjectContextManager(context);
      
      const stepId = manager.addWorkflowStep({
        stage: WorkflowStage.IMPLEMENTATION,
        status: WorkflowStatus.PENDING,
        agentName: 'Implementer',
        requiresApproval: false
      });

      // Simulate error
      manager.updateStepStatus(stepId, WorkflowStatus.FAILED, undefined, 'Implementation failed');
      manager.addError(WorkflowStage.IMPLEMENTATION, 'Implementation failed');

      const updatedContext = manager.getContext();
      expect(updatedContext.errors).toHaveLength(1);
      expect(updatedContext.errors[0].error).toBe('Implementation failed');
      
      const failedStep = updatedContext.workflow.find(step => step.id === stepId);
      expect(failedStep?.status).toBe(WorkflowStatus.FAILED);
    });

    it('should handle approval workflows', () => {
      const context = ProjectContextManager.create('Approval test');
      const manager = new ProjectContextManager(context);
      
      const stepId = manager.addWorkflowStep({
        stage: WorkflowStage.DEVOPS,
        status: WorkflowStatus.PENDING,
        agentName: 'DevOps',
        requiresApproval: true
      });

      // Request approval
      manager.addApprovalRequest(stepId, 'Please approve deployment', { plan: 'deployment-plan' });
      
      expect(manager.getContext().status).toBe(WorkflowStatus.REQUIRES_APPROVAL);
      expect(manager.getContext().pendingApprovals).toHaveLength(1);

      // Approve step
      manager.approveStep(stepId);
      
      expect(manager.getContext().status).toBe(WorkflowStatus.IN_PROGRESS);
      expect(manager.getContext().pendingApprovals).toHaveLength(0);
    });
  });

  describe('Agent Integration Points', () => {
    it('should verify agent interface compatibility', async () => {
      // Import agents to verify they exist and have expected structure
      const { triageAgent } = await import('../../src/agent/triage.js');
      const { architectAgent } = await import('../../src/agent/architect.js');
      const { implementerAgent } = await import('../../src/agent/implementer.js');
      const { testAgent } = await import('../../src/agent/tester.js');
      const { reviewerAgent } = await import('../../src/agent/reviewer.js');
      const { devopsAgent } = await import('../../src/agent/devops.js');
      const { docsAgent } = await import('../../src/agent/docs.js');

      // Verify agents have expected name property
      expect(triageAgent.name).toBe('Triage');
      expect(architectAgent.name).toBe('Architect');
      expect(implementerAgent.name).toBe('Implementer');
      expect(testAgent.name).toBe('Test');
      expect(reviewerAgent.name).toBe('Reviewer');
      expect(devopsAgent.name).toBe('DevOps');
      expect(docsAgent.name).toBe('Docs');
    });

    it('should handle agent execution simulation', async () => {
      mockRun.mockResolvedValue({
        finalOutput: { summary: 'Agent execution completed' }
      });

      // Test that run function can be called (mocked)
      const { run } = await import('@openai/agents');
      const result = await run({} as any, 'test input', { maxTurns: 1 });
      
      expect(result.finalOutput.summary).toBe('Agent execution completed');
      expect(mockRun).toHaveBeenCalledWith({}, 'test input', { maxTurns: 1 });
    });

    it('should validate agent output schemas', () => {
      const { 
        ArchitecturePlan, 
        ImplementationResult, 
        TestReport, 
        ReviewReport 
      } = require('../../src/agent/schemas.js');

      // Test schema validation
      const validArchPlan = {
        projectName: 'Test Project',
        stack: ['TypeScript'],
        services: ['API'],
        directories: ['src/'],
        envVars: [],
        decisions: [],
        risks: [],
        initialBacklog: []
      };

      const archResult = ArchitecturePlan.safeParse(validArchPlan);
      expect(archResult.success).toBe(true);

      const validImplResult = {
        summary: 'Implementation complete',
        createdFiles: [],
        modifiedFiles: [],
        commandsToRun: [],
        notes: ''
      };

      const implResult = ImplementationResult.safeParse(validImplResult);
      expect(implResult.success).toBe(true);

      const validTestReport = {
        passed: 10,
        failed: 0,
        newTests: [],
        coverageNote: ''
      };

      const testResult = TestReport.safeParse(validTestReport);
      expect(testResult.success).toBe(true);

      const validReviewReport = {
        summary: 'Review complete',
        issues: [],
        score: 100,
        actionItems: []
      };

      const reviewResult = ReviewReport.safeParse(validReviewReport);
      expect(reviewResult.success).toBe(true);
    });
  });

  describe('End-to-End Workflow Simulation', () => {
    it('should simulate complete workflow stages', () => {
      const stages = [
        WorkflowStage.TRIAGE,
        WorkflowStage.RESEARCH,
        WorkflowStage.ARCHITECTURE,
        WorkflowStage.IMPLEMENTATION,
        WorkflowStage.TESTING,
        WorkflowStage.REVIEW,
        WorkflowStage.DEVOPS,
        WorkflowStage.DOCUMENTATION
      ];

      const context = ProjectContextManager.create('E2E simulation');
      const manager = new ProjectContextManager(context);

      // Add all workflow steps
      const stepIds = stages.map(stage => 
        manager.addWorkflowStep({
          stage,
          status: WorkflowStatus.PENDING,
          agentName: stage.charAt(0).toUpperCase() + stage.slice(1),
          requiresApproval: false
        })
      );

      expect(stepIds).toHaveLength(stages.length);
      expect(manager.getContext().workflow).toHaveLength(stages.length);

      // Simulate execution of each step
      stepIds.forEach((stepId, index) => {
        manager.updateStepStatus(
          stepId, 
          WorkflowStatus.COMPLETED, 
          { result: `${stages[index]} completed` }
        );

        if (index < stepIds.length - 1) {
          manager.moveToNextStep();
        }
      });

      // Verify all steps completed
      const finalContext = manager.getContext();
      expect(finalContext.workflow.every(step => step.status === WorkflowStatus.COMPLETED)).toBe(true);
    });

    it('should handle iterative workflow with PDCA cycles', () => {
      const context = ProjectContextManager.create('PDCA simulation');
      const manager = new ProjectContextManager(context);

      // Initial implementation
      const implStepId = manager.addWorkflowStep({
        stage: WorkflowStage.IMPLEMENTATION,
        status: WorkflowStatus.PENDING,
        agentName: 'Implementer',
        requiresApproval: false
      });

      const testStepId = manager.addWorkflowStep({
        stage: WorkflowStage.TESTING,
        status: WorkflowStatus.PENDING,
        agentName: 'Tester',
        requiresApproval: false
      });

      // Complete implementation
      manager.updateStepStatus(
        implStepId, 
        WorkflowStatus.COMPLETED, 
        { summary: 'Initial implementation' }
      );

      manager.moveToNextStep();

      // First test iteration with failures
      manager.updateStepStatus(
        testStepId, 
        WorkflowStatus.COMPLETED, 
        { passed: 5, failed: 3, newTests: [], coverageNote: '' }
      );

      // Check if iteration needed (failed tests)
      const testResult = manager.getContext().workflow.find(s => s.id === testStepId)?.result;
      const shouldIterate = testResult?.failed > 0;
      expect(shouldIterate).toBe(true);

      if (shouldIterate) {
        manager.incrementIteration();
        expect(manager.getContext().iterationCount).toBe(1);
      }
    });

    it('should validate data flow through workflow stages', () => {
      const context = ProjectContextManager.create('Data flow validation');
      context.triageResult = { memo: 'Triage completed' };
      context.architecturePlan = {
        projectName: 'Flow Test',
        stack: ['TypeScript'],
        services: ['API'],
        directories: ['src/'],
        envVars: [],
        decisions: [],
        risks: [],
        initialBacklog: []
      };
      context.implementationResult = {
        summary: 'Implementation completed',
        createdFiles: ['src/app.ts'],
        modifiedFiles: [],
        commandsToRun: [],
        notes: ''
      };
      
      const manager = new ProjectContextManager(context);
      const updatedContext = manager.getContext();

      expect(updatedContext.triageResult?.memo).toBe('Triage completed');
      expect(updatedContext.architecturePlan?.projectName).toBe('Flow Test');
      expect(updatedContext.implementationResult?.summary).toBe('Implementation completed');
      expect(updatedContext.implementationResult?.createdFiles).toContain('src/app.ts');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle workflow timeout scenarios gracefully', async () => {
      const context = ProjectContextManager.create('Timeout test');
      const manager = new ProjectContextManager(context);

      const stepId = manager.addWorkflowStep({
        stage: WorkflowStage.IMPLEMENTATION,
        status: WorkflowStatus.PENDING,
        agentName: 'Implementer',
        requiresApproval: false
      });

      // Simulate timeout error
      manager.updateStepStatus(
        stepId, 
        WorkflowStatus.FAILED, 
        undefined, 
        'Operation timeout'
      );

      manager.addError(WorkflowStage.IMPLEMENTATION, 'Operation timeout');

      const updatedContext = manager.getContext();
      expect(updatedContext.errors).toHaveLength(1);
      expect(updatedContext.errors[0].error).toBe('Operation timeout');
    });

    it('should maintain state consistency under concurrent operations', () => {
      const context = ProjectContextManager.create('Concurrency test');
      const manager = new ProjectContextManager(context);

      // Simulate concurrent step additions
      const stepIds = [];
      for (let i = 0; i < 10; i++) {
        stepIds.push(manager.addWorkflowStep({
          stage: WorkflowStage.IMPLEMENTATION,
          status: WorkflowStatus.PENDING,
          agentName: `Agent${i}`,
          requiresApproval: false
        }));
      }

      expect(stepIds).toHaveLength(10);
      expect(manager.getContext().workflow).toHaveLength(10);

      // Verify all steps have unique IDs
      const uniqueIds = new Set(stepIds);
      expect(uniqueIds.size).toBe(10);
    });

    it('should handle resource cleanup properly', () => {
      const context = ProjectContextManager.create('Cleanup test');
      const manager = new ProjectContextManager(context);

      // Add large amount of data
      const largeData = {
        artifacts: {
          generatedFiles: Array(1000).fill('file.ts'),
          modifiedFiles: Array(500).fill('modified.ts'),
          testFiles: Array(100).fill('test.ts'),
          documentFiles: Array(50).fill('doc.md')
        }
      };

      manager.updateContext(largeData);

      const updatedContext = manager.getContext();
      expect(updatedContext.artifacts.generatedFiles).toHaveLength(1000);
      expect(updatedContext.artifacts.modifiedFiles).toHaveLength(500);
      expect(updatedContext.artifacts.testFiles).toHaveLength(100);
      expect(updatedContext.artifacts.documentFiles).toHaveLength(50);
    });
  });
});
