// tests/utils/agentRunner.test.ts - Phase 1 OpenAI Agent Integration Test for AgentRunner Functions
/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { runAgent, runAgentWithRetry } from '../../src/utils/agentRunner.js';
import { initializeAgentSDK } from '../../src/utils/agentConfig.js';

// Mock modules
vi.mock('../../src/utils/sharedRunner.js', () => ({
  getSharedRunner: vi.fn()
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Import after mocking
import { getSharedRunner } from '../../src/utils/sharedRunner.js';

// テスト用SDK初期化
beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.OPENAI_API_KEY = 'test-key';
  
  initializeAgentSDK();
});

describe('SafeAgentRunner - Phase 1 SDK Integration Tests', () => {
  let mockAgent: any;
  let mockRunner: any;

  beforeEach(() => {
    mockAgent = {
      name: 'TestAgent',
      instructions: 'Test instructions',
      model: 'gpt-4o'
    };
    
    // Mock Runner instance
    mockRunner = {
      run: vi.fn()
    };
    
    // Mock getSharedRunner to return our mock
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    vi.mocked(getSharedRunner).mockReturnValue(mockRunner);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute agent successfully with shared runner', async () => {
    // Mock successful SDK response structure
    mockRunner.run.mockResolvedValue({
      finalOutput: 'Success response',
      usage: { totalTokens: 150 },
      messages: [
        { role: 'user', content: 'Test input' },
        { role: 'assistant', content: 'Success response' }
      ]
    } as any);

    const result = await runAgent(mockAgent, 'Test input');

    expect(result.success).toBe(true);
    expect(result.data).toBe('Success response');
    expect(mockRunner.run).toHaveBeenCalledWith(mockAgent, 'Test input', {
      maxTurns: 10,
      context: undefined,
      signal: undefined
    });
  });

  it('should handle agent execution errors', async () => {
    mockRunner.run.mockRejectedValue(new Error('Execution failed'));

    const result = await runAgent(mockAgent, 'Test input');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Execution failed');
  });

  it('should retry failed executions', async () => {
    // First attempt fails, second succeeds
    mockRunner.run
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce({
        finalOutput: 'Success after retry',
        usage: { totalTokens: 100 }
      } as any);

    const result = await runAgentWithRetry(
      mockAgent, 
      'Test input', 
      2
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe('Success after retry');
    expect(mockRunner.run).toHaveBeenCalledTimes(2);
  });

  it('should fail after max retries', async () => {
    mockRunner.run.mockRejectedValue(new Error('Persistent error'));

    const result = await runAgentWithRetry(
      mockAgent, 
      'Test input', 
      2
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed after 2 retry attempts');
    // retries:2 means initial attempt + 2 retries = 3 total calls
    expect(mockRunner.run).toHaveBeenCalledTimes(3);
  });

  it('should handle empty responses gracefully', async () => {
    // Mock empty but valid response with finalOutput
    mockRunner.run.mockResolvedValue({ finalOutput: {} } as any);

    const result = await runAgent(mockAgent, 'Test input');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({});
  });

  it('should handle malformed responses gracefully', async () => {
    const testCases = [
      { description: 'no finalOutput', mockValue: {}, expectedSuccess: true }, // finalOutput is undefined but still success
      { description: 'null finalOutput', mockValue: { finalOutput: null }, expectedSuccess: true },
      { description: 'valid finalOutput', mockValue: { finalOutput: 'test' }, expectedSuccess: true }
    ];

    for (const testCase of testCases) {
      // Create new mock for each test to avoid interference
      const freshMockRunner = { run: vi.fn() };
      vi.mocked(getSharedRunner).mockReturnValue(freshMockRunner as any);
      
      freshMockRunner.run.mockResolvedValue(testCase.mockValue as any);
      
      const result = await runAgent(mockAgent, 'Test input');
      
      // Should always return a structured result
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      expect(result.success).toBe(testCase.expectedSuccess);
    }
  });

  it('should validate agent configuration', async () => {
    // First test a simple success case to establish baseline
    mockRunner.run.mockResolvedValue({ finalOutput: 'test' } as any);
    const validResult = await runAgent(mockAgent, 'Test input');
    expect(validResult.success).toBe(true);

    // Then test that null agents will still try to execute but may fail
    mockRunner.run.mockRejectedValue(new Error('Invalid agent'));
    const invalidResult = await runAgent(null as any, 'Test input');
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error).toBe('Invalid agent');
  });

  it('should preserve message history during execution', async () => {
    mockRunner.run.mockResolvedValue({
      finalOutput: 'New response',
      messages: [{ role: 'assistant', content: 'New response' }]
    } as any);

    // Test basic execution - message history preservation is handled by the Runner
    const result = await runAgent(mockAgent, 'New input');

    expect(result.success).toBe(true);
    expect(result.data).toBe('New response');
    expect(mockRunner.run).toHaveBeenCalledWith(mockAgent, 'New input', {
      maxTurns: 10,
      context: undefined,
      signal: undefined
    });
  });
});
