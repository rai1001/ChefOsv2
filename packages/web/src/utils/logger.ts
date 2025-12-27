/**
 * Simple logging utility that respects environment
 * Prevents console logs in production builds
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
    /**
     * Log informational messages (development only)
     */
    info: (...args: unknown[]) => {
        if (isDevelopment) {
            console.log('[INFO]', ...args);
        }
    },

    /**
     * Log warning messages (development only)
     */
    warn: (...args: unknown[]) => {
        if (isDevelopment) {
            console.warn('[WARN]', ...args);
        }
    },

    /**
     * Log error messages (always logged)
     */
    error: (...args: unknown[]) => {
        console.error('[ERROR]', ...args);
    },

    /**
     * Log debug messages (development only)
     */
    debug: (...args: unknown[]) => {
        if (isDevelopment) {
            console.debug('[DEBUG]', ...args);
        }
    }
};
