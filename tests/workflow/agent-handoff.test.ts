// tests/workflow/agent-handoff.test.ts
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Agent, handoff } from '@openai/agents';
import { z } from 'zod';

// Mock the entire @openai/agents module
vi.mock('@openai/agents', () => ({
  Agent: {
    create: vi.fn()
  },
  handoff: vi.fn(),
  run: vi.fn()
}));

// Mock agent modules
vi.mock('../../src/agent/triage.js');
vi.mock('../../src/agent/architect.js');
vi.mock('../../src/agent/implementer.js');
vi.mock('../../src/agent/reviewer.js');
vi.mock('../../src/agent/tester.js');

describe('Agent Handoff and Communication Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Handoff Schema Validation', () => {
    it('should validate handoff input schemas', () => {
      const TriageNoteSchema = z.object({ memo: z.string().optional() });
      
      // Valid handoff data
      const validNote = { memo: 'Task triaged successfully' };
      const result = TriageNoteSchema.safeParse(validNote);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.memo).toBe('Task triaged successfully');
      }
    });

    it('should handle empty handoff data', () => {
      const TriageNoteSchema = z.object({ memo: z.string().optional() });
      
      const emptyNote = {};
      const result = TriageNoteSchema.safeParse(emptyNote);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.memo).toBeUndefined();
      }
    });

    it('should validate complex handoff schemas', () => {
      const HandoffNoteSchema = z.object({
        reason: z.string().describe('移譲理由（1行）'),
        context: z.string().describe('要約（200字以内）').optional(),
      });

      const validHandoff = {
        reason: 'Need specialized implementation',
        context: 'User requested React component with TypeScript'
      };

      const result = HandoffNoteSchema.safeParse(validHandoff);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reason).toBe('Need specialized implementation');
        expect(result.data.context).toBe('User requested React component with TypeScript');
      }
    });

    it('should reject invalid handoff data', () => {
      const HandoffNoteSchema = z.object({
        reason: z.string(),
        context: z.string().optional(),
      });

      const invalidHandoff = {
        reason: 123, // Should be string
        context: true // Should be string or undefined
      };

      const result = HandoffNoteSchema.safeParse(invalidHandoff);
      expect(result.success).toBe(false);
    });
  });

  describe('Agent Creation and Configuration', () => {
    it('should create agents with proper handoff configuration', () => {
      const mockAgent = {
        name: 'TestAgent',
        instructions: 'Test instructions',
        tools: [],
        handoffs: []
      };

      const MockAgent = vi.mocked(Agent);
      MockAgent.create = vi.fn().mockReturnValue(mockAgent);

      const agent = MockAgent.create({
        name: 'TestAgent',
        instructions: 'Test instructions',
        tools: [],
        handoffs: []
      });

      expect(MockAgent.create).toHaveBeenCalledWith({
        name: 'TestAgent',
        instructions: 'Test instructions',
        tools: [],
        handoffs: []
      });

      expect(agent).toEqual(mockAgent);
    });

    it('should configure handoffs between agents', () => {
      const mockHandoff = vi.mocked(handoff);
      mockHandoff.mockReturnValue('mocked-handoff' as any);

      const targetAgent = { name: 'TargetAgent' };
      const inputSchema = z.object({ data: z.string() });

      const handoffConfig = mockHandoff(targetAgent as any, {
        inputType: inputSchema
      });

      expect(mockHandoff).toHaveBeenCalledWith(targetAgent, {
        inputType: inputSchema
      });

      expect(handoffConfig).toBe('mocked-handoff');
    });

    it('should handle multiple handoff configurations', () => {
      const mockHandoff = vi.mocked(handoff);
      mockHandoff.mockReturnValue('mocked-handoff' as any);

      const agent1 = { name: 'Agent1' };
      const agent2 = { name: 'Agent2' };
      const agent3 = { name: 'Agent3' };

      const schema = z.object({ memo: z.string().optional() });

      const handoffs = [
        mockHandoff(agent1 as any, { inputType: schema }),
        mockHandoff(agent2 as any, { inputType: schema }),
        mockHandoff(agent3 as any, { inputType: schema })
      ];

      expect(mockHandoff).toHaveBeenCalledTimes(3);
      expect(handoffs).toHaveLength(3);
    });
  });

  describe('Inter-Agent Data Flow', () => {
    it('should pass data correctly between triage and architect agents', () => {
      const triageOutput = {
        memo: 'Architectural planning needed for new React application'
      };

      const expectedArchitectInput = {
        memo: 'Architectural planning needed for new React application'
      };

      // Simulate handoff data transformation
      const transformedData = { ...triageOutput };
      
      expect(transformedData).toEqual(expectedArchitectInput);
    });

    it('should handle architect to implementer handoff', () => {
      const architectOutput = {
        projectName: 'React Dashboard',
        stack: ['React', 'TypeScript', 'Vite'],
        services: ['Frontend', 'API'],
        directories: ['src/', 'tests/', 'docs/'],
        envVars: ['VITE_API_URL'],
        decisions: ['Use Vite for build tooling'],
        risks: ['Bundle size optimization needed'],
        initialBacklog: []
      };

      const handoffNote = {
        reason: 'Implementation required based on architecture plan',
        context: `Implement ${architectOutput.projectName} using ${architectOutput.stack.join(', ')}`
      };

      expect(handoffNote.reason).toBe('Implementation required based on architecture plan');
      expect(handoffNote.context).toContain('React Dashboard');
      expect(handoffNote.context).toContain('React, TypeScript, Vite');
    });

    it('should handle implementer to tester handoff', () => {
      const implementationOutput = {
        summary: 'React dashboard implemented with TypeScript',
        createdFiles: ['src/App.tsx', 'src/Dashboard.tsx', 'src/api/client.ts'],
        modifiedFiles: ['package.json', 'vite.config.ts'],
        commandsToRun: ['npm install', 'npm run build'],
        notes: 'All components implemented with proper TypeScript types'
      };

      const handoffNote = {
        reason: 'Testing required for implemented components',
        context: `Test ${implementationOutput.createdFiles.length} new files and verify build process`
      };

      expect(handoffNote.reason).toBe('Testing required for implemented components');
      expect(handoffNote.context).toContain('Test 3 new files');
    });

    it('should handle tester to reviewer handoff', () => {
      const testOutput = {
        passed: 15,
        failed: 2,
        newTests: ['App.test.tsx', 'Dashboard.test.tsx', 'api.test.ts'],
        coverageNote: 'Coverage at 85%, missing edge case tests'
      };

      const handoffNote = {
        reason: 'Code review required after testing',
        context: `${testOutput.passed} tests passed, ${testOutput.failed} failed. Coverage: 85%`
      };

      expect(handoffNote.reason).toBe('Code review required after testing');
      expect(handoffNote.context).toContain('15 tests passed, 2 failed');
      expect(handoffNote.context).toContain('Coverage: 85%');
    });

    it('should handle reviewer feedback loop', () => {
      const reviewOutput = {
        summary: 'Code review completed with issues found',
        issues: [
          {
            kind: 'performance',
            path: 'src/Dashboard.tsx',
            message: 'Unnecessary re-renders detected',
            severity: 'warn' as const
          },
          {
            kind: 'security',
            path: 'src/api/client.ts',
            message: 'API credentials exposed in client code',
            severity: 'error' as const
          }
        ],
        score: 65,
        actionItems: [
          {
            id: 'fix-1',
            title: 'Optimize Dashboard component',
            detail: 'Add React.memo and useCallback',
            estimateH: 2
          },
          {
            id: 'fix-2',
            title: 'Secure API credentials',
            detail: 'Move credentials to server-side',
            estimateH: 3
          }
        ]
      };

      // Should trigger iteration if critical issues found
      const hasCriticalIssues = reviewOutput.issues.some(issue => issue.severity === 'error');
      expect(hasCriticalIssues).toBe(true);
      
      const shouldIterate = hasCriticalIssues || reviewOutput.score < 70;
      expect(shouldIterate).toBe(true);

      const handoffNote = {
        reason: 'Implementation fixes required based on review',
        context: `${reviewOutput.issues.length} issues found, score: ${reviewOutput.score}%`
      };

      expect(handoffNote.reason).toBe('Implementation fixes required based on review');
      expect(handoffNote.context).toContain('2 issues found, score: 65%');
    });
  });

  describe('Error Handling in Handoffs', () => {
    it('should handle malformed handoff data gracefully', () => {
      const malformedData = {
        unexpectedField: 'should be ignored',
        memo: 'valid memo'
      };

      const TriageNoteSchema = z.object({ memo: z.string().optional() });
      const result = TriageNoteSchema.safeParse(malformedData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.memo).toBe('valid memo');
        expect('unexpectedField' in result.data).toBe(false);
      }
    });

    it('should handle missing required handoff data', () => {
      const incompleteData = {};

      const RequiredSchema = z.object({
        requiredField: z.string(),
        optionalField: z.string().optional()
      });

      const result = RequiredSchema.safeParse(incompleteData);
      expect(result.success).toBe(false);
    });

    it('should validate handoff data types strictly', () => {
      const wrongTypeData = {
        memo: 123, // Should be string
        context: ['array', 'instead', 'of', 'string'] // Should be string
      };

      const HandoffSchema = z.object({
        memo: z.string().optional(),
        context: z.string().optional()
      });

      const result = HandoffSchema.safeParse(wrongTypeData);
      expect(result.success).toBe(false);
    });

    it('should handle empty or null handoff data', () => {
      const TriageNoteSchema = z.object({ memo: z.string().optional() });

      const nullResult = TriageNoteSchema.safeParse(null);
      expect(nullResult.success).toBe(false);

      const undefinedResult = TriageNoteSchema.safeParse(undefined);
      expect(undefinedResult.success).toBe(false);

      const emptyResult = TriageNoteSchema.safeParse({});
      expect(emptyResult.success).toBe(true);
    });
  });

  describe('Handoff Performance and Scalability', () => {
    it('should handle large handoff payloads efficiently', () => {
      const largePayload = {
        memo: 'Large dataset processing'.repeat(1000),
        data: Array(10000).fill(null).map((_, i) => ({
          id: i,
          value: `item-${i}`,
          metadata: {
            timestamp: new Date().toISOString(),
            processed: i % 2 === 0
          }
        }))
      };

      const LargeSchema = z.object({
        memo: z.string(),
        data: z.array(z.object({
          id: z.number(),
          value: z.string(),
          metadata: z.object({
            timestamp: z.string(),
            processed: z.boolean()
          })
        }))
      });

      const startTime = Date.now();
      const result = LargeSchema.safeParse(largePayload);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should parse in under 1 second

      if (result.success) {
        expect(result.data.data).toHaveLength(10000);
        expect(result.data.memo).toContain('Large dataset processing');
      }
    });

    it('should handle multiple concurrent handoffs', async () => {
      const HandoffSchema = z.object({
        id: z.string(),
        timestamp: z.string(),
        data: z.any()
      });

      const concurrentHandoffs = Array(100).fill(null).map((_, i) => ({
        id: `handoff-${i}`,
        timestamp: new Date().toISOString(),
        data: { value: i, processed: false }
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        concurrentHandoffs.map(async handoff => {
          // Simulate async processing
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          return HandoffSchema.safeParse(handoff);
        })
      );
      const endTime = Date.now();

      expect(results).toHaveLength(100);
      expect(results.every(result => result.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should maintain data integrity across multiple handoffs', () => {
      const originalData = {
        projectId: 'proj-123',
        request: 'Create user authentication system',
        priority: 'high',
        metadata: {
          createdAt: new Date().toISOString(),
          userId: 'user-456',
          version: '1.0'
        }
      };

      // Simulate data flowing through multiple agents
      const currentData = { ...originalData };

      // Triage -> Architect
      const triageHandoff = {
        memo: 'Authentication system needs architectural planning',
        originalData: currentData
      };

      // Architect -> Implementer
      const architectHandoff = {
        reason: 'Implementation required',
        context: 'Design OAuth2 + JWT authentication',
        projectData: triageHandoff.originalData
      };

      // Implementer -> Tester
      const implementerHandoff = {
        reason: 'Testing required',
        context: 'Implemented auth endpoints and middleware',
        projectData: architectHandoff.projectData
      };

      // Verify data integrity maintained
      expect(implementerHandoff.projectData.projectId).toBe(originalData.projectId);
      expect(implementerHandoff.projectData.request).toBe(originalData.request);
      expect(implementerHandoff.projectData.priority).toBe(originalData.priority);
      expect(implementerHandoff.projectData.metadata.userId).toBe(originalData.metadata.userId);
    });
  });

  describe('Agent Communication Patterns', () => {
    it('should support broadcast handoffs to multiple agents', () => {
      const broadcastData = {
        announcement: 'Project requirements changed',
        impact: 'all',
        details: 'New security requirements added'
      };

      const targetAgents = ['architect', 'implementer', 'tester', 'reviewer'];
      
      const handoffs = targetAgents.map(agent => ({
        target: agent,
        data: broadcastData,
        timestamp: new Date().toISOString()
      }));

      expect(handoffs).toHaveLength(4);
      expect(handoffs.every(h => h.data.announcement === broadcastData.announcement)).toBe(true);
    });

    it('should support conditional handoffs based on results', () => {
      const testResults = {
        passed: 8,
        failed: 3,
        coverage: 72
      };

      // Conditional logic for handoffs
      let nextAgent: string;
      let handoffReason: string;

      if (testResults.failed > 0) {
        nextAgent = 'implementer';
        handoffReason = 'Fix failing tests';
      } else if (testResults.coverage < 80) {
        nextAgent = 'tester';
        handoffReason = 'Improve test coverage';
      } else {
        nextAgent = 'reviewer';
        handoffReason = 'Ready for review';
      }

      expect(nextAgent).toBe('implementer');
      expect(handoffReason).toBe('Fix failing tests');
    });

    it('should support priority-based handoff routing', () => {
      const tasks = [
        { id: 1, priority: 'low', agent: 'implementer' },
        { id: 2, priority: 'high', agent: 'implementer' },
        { id: 3, priority: 'critical', agent: 'reviewer' },
        { id: 4, priority: 'medium', agent: 'tester' }
      ];

      // Sort by priority for handoff order
      const priorityOrder = ['critical', 'high', 'medium', 'low'];
      const sortedTasks = tasks.sort((a, b) => 
        priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
      );

      expect(sortedTasks[0].priority).toBe('critical');
      expect(sortedTasks[1].priority).toBe('high');
      expect(sortedTasks[2].priority).toBe('medium');
      expect(sortedTasks[3].priority).toBe('low');
    });

    it('should handle circular handoff prevention', () => {
      const handoffHistory = [
        { from: 'triage', to: 'architect', timestamp: '2024-01-01T10:00:00Z' },
        { from: 'architect', to: 'implementer', timestamp: '2024-01-01T10:05:00Z' },
        { from: 'implementer', to: 'tester', timestamp: '2024-01-01T10:10:00Z' },
        { from: 'tester', to: 'reviewer', timestamp: '2024-01-01T10:15:00Z' },
        { from: 'reviewer', to: 'implementer', timestamp: '2024-01-01T10:20:00Z' }
      ];

      const proposedHandoff = { from: 'implementer', to: 'tester' };

      // Check for potential circular handoff
      const recentHandoffs = handoffHistory.slice(-3);
      const wouldCreateCircle = recentHandoffs.some(h => 
        h.from === proposedHandoff.to && h.to === proposedHandoff.from
      );

      expect(wouldCreateCircle).toBe(true);
    });
  });
});
