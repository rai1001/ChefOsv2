import { describe, it, expect, vi, afterEach } from 'vitest';
import { logger } from './logger';

describe('Logger Utility', () => {
    const consoleSpy = {
        log: vi.spyOn(console, 'log').mockImplementation(() => { }),
        warn: vi.spyOn(console, 'warn').mockImplementation(() => { }),
        error: vi.spyOn(console, 'error').mockImplementation(() => { }),
        debug: vi.spyOn(console, 'debug').mockImplementation(() => { }),
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should log error messages', () => {
        logger.error('Test error message');
        expect(consoleSpy.error).toHaveBeenCalledWith('[ERROR]', 'Test error message');
    });

    // Validating basic behavior.
    // Note: isDevelopment const is resolved at module import time, 
    // so we document current behavior rather than trying to reload module for prod test in this simple suite.
    it('should log info messages if in dev/test environment', () => {
        // Assuming test env acts as dev or we can check import.meta.env
        if (import.meta.env.DEV) {
            logger.info('Test info message');
            expect(consoleSpy.log).toHaveBeenCalledWith('[INFO]', 'Test info message');
        } else {
            console.log('Skipping info test in non-dev env');
        }
    });

    it('should log warning messages if in dev/test environment', () => {
        if (import.meta.env.DEV) {
            logger.warn('Test warn message');
            expect(consoleSpy.warn).toHaveBeenCalledWith('[WARN]', 'Test warn message');
        }
    });
});
