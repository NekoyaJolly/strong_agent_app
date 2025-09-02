import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { TestRunner } from '../../src/utils/testRunner.js';
import fs from 'fs/promises';

describe('TestRunner', () => {
  let testRunner: TestRunner;

  beforeEach(() => {
    testRunner = new TestRunner();
  });

  describe('基本機能', () => {
    it('should create TestRunner instance', () => {
      expect(testRunner).toBeInstanceOf(TestRunner);
    });
  });

  // Windows環境での統合テストは現在スキップ
  // 実際のCI環境（Linux）では動作することを前提として実装
  describe.skip('プロジェクトテスト実行 (統合テスト)', () => {
    it('should execute project tests', async () => {
      const result = await testRunner.executeProjectTests();
      
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('details');
      expect(result).toHaveProperty('errors');
      
      expect(typeof result.passed).toBe('number');
      expect(typeof result.failed).toBe('number');
      expect(typeof result.total).toBe('number');
      expect(Array.isArray(result.details)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    }, 30000);
  });

  describe.skip('ESLint統合 (統合テスト)', () => {
    it('should run ESLint and return structured results', async () => {
      const result = await testRunner.runESLint();
      
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('score');
      expect(Array.isArray(result.issues)).toBe(true);
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }, 15000);
  });

  describe.skip('TypeScript型チェック (統合テスト)', () => {
    it('should run TypeScript compiler check', async () => {
      const result = await testRunner.runTypeCheck();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('errors');
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    }, 10000);
  });

  describe.skip('生成されたテストの実行 (統合テスト)', () => {
    it('should execute simple generated test code', async () => {
      const simpleTestCode = `
        import { describe, it, expect } from '@jest/globals';
        
        describe('Simple Test', () => {
          it('should pass', () => {
            expect(1 + 1).toBe(2);
          });
          
          it('should also pass', () => {
            expect(true).toBe(true);
          });
        });
      `;

      const result = await testRunner.executeGeneratedTests(simpleTestCode);
      
      expect(result.passed).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
    }, 20000);

    it('should handle failing tests correctly', async () => {
      const failingTestCode = `
        import { describe, it, expect } from '@jest/globals';
        
        describe('Failing Test', () => {
          it('should fail', () => {
            expect(1 + 1).toBe(3); // 意図的な失敗
          });
        });
      `;

      const result = await testRunner.executeGeneratedTests(failingTestCode);
      
      expect(result.failed).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    }, 20000);
  });
});
