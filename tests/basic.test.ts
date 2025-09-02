import { describe, it, expect } from 'vitest';

describe('Basic Tests', () => {
  it('should work with vitest', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle strings', () => {
    expect('hello').toBe('hello');
  });
});
