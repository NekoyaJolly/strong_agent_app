// Global test setup
import { jest } from '@jest/globals';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-key';

// Global mocks
global.console = {
  ...console,
  // Suppress logs during tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
