// import { trace } from 'firebase/performance';
// import { perf } from '@/config/firebase';

const MAX_ATTR_LENGTH = 100;
const truncate = (str: string) => {
  if (!str) return '';
  // Sanitize: allow alphanumeric, underscores, hyphens, periods, spaces. Remove potentially invalid chars.
  const sanitized = String(str).replace(/[^a-zA-Z0-9_\- .]/g, '_');
  return sanitized.length > MAX_ATTR_LENGTH
    ? sanitized.substring(0, MAX_ATTR_LENGTH - 3) + '...'
    : sanitized;
};

/**
 * Utility to measure performance of sync/async functions using Firebase Performance
 */
export const performanceUtils = {
  /**
   * Measure execution time of an async function
   * @param name Name of the trace
   * @param fn Async function to execute
   */
  measureAsync: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    // if (!perf) return await fn();
    // const perfTrace = trace(perf, truncate(name));
    // perfTrace.start();
    try {
      const result = await fn();
      return result;
    } finally {
      // perfTrace.stop();
    }
  },

  /**
   * Measure execution time of a sync function
   * @param name Name of the trace
   * @param fn Function to execute
   */
  measureSync: <T>(name: string, fn: () => T): T => {
    // if (!perf) return fn();
    // const perfTrace = trace(perf, truncate(name));
    // perfTrace.start();
    try {
      const result = fn();
      return result;
    } finally {
      // perfTrace.stop();
    }
  },

  /**
   * Start a custom trace manually. Don't forget to call .stop()!
   * @param name Name of the trace
   */
  startTrace: (name: string) => {
    // if (!perf) return { stop: () => {}, putAttribute: () => {} } as any;
    // const perfTrace = trace(perf, truncate(name));
    // perfTrace.start();

    // Wrap putAttribute to ensure safety
    // const originalPutAttribute = perfTrace.putAttribute.bind(perfTrace);
    // perfTrace.putAttribute = (attr: string, value: string) => {
    //   originalPutAttribute(attr, truncate(value));
    // };

    return { stop: () => {}, putAttribute: () => {} } as any;
  },
};
