import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Logger } from '../../src/utils/logger.js';

describe('Logger', () => {
  let logger: Logger;
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    logger = new Logger('TestContext');
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('ログレベル機能', () => {
    it('should log info messages with correct format', () => {
      logger.info('Test info message', { key: 'value' });
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleLogSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('INFO');
      expect(loggedMessage).toContain('Test info message');
      expect(loggedMessage).toContain('TestContext');
    });

    it('should log warning messages', () => {
      logger.warn('Test warning', { warning: true });
      
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleWarnSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('WARN');
      expect(loggedMessage).toContain('Test warning');
    });

    it('should log error messages with error details', () => {
      const testError = new Error('Test error');
      logger.error('Error occurred', testError, { extra: 'data' });
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('ERROR');
      expect(loggedMessage).toContain('Error occurred');
      expect(loggedMessage).toContain('Test error');
    });
  });

  describe('Trace ID機能', () => {
    it('should generate unique trace IDs', () => {
      // 新しいスコープで独立したロガーをテスト
      const freshLogger1 = new Logger('Context1');
      const freshLogger2 = new Logger('Context2');
      
      // 新しいスパイを作成してクリーンな状態でテスト
      const freshLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      freshLogger1.info('test1');
      freshLogger2.info('test2');
      
      expect(freshLogSpy).toHaveBeenCalledTimes(2);
      
      // 各呼び出しで異なるトレースIDが使われていることを確認
      const call1 = freshLogSpy.mock.calls[0][0];
      const call2 = freshLogSpy.mock.calls[1][0];
      expect(call1).not.toEqual(call2);
      
      // トレースIDパターンが含まれることを確認
      expect(call1).toMatch(/trace-\d+-[a-z0-9]+/);
      expect(call2).toMatch(/trace-\d+-[a-z0-9]+/);
      
      freshLogSpy.mockRestore();
    });
  });

  describe('コンテキスト機能', () => {
    it('should include context in log output', () => {
      const contextLogger = new Logger('SpecificContext');
      contextLogger.info('Context test');
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleLogSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('SpecificContext');
    });
  });
});
