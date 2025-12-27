import { trace } from 'firebase/performance';
import { perf } from '@/config/firebase';

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
    if (!perf) return await fn();
    const perfTrace = trace(perf, name);
    perfTrace.start();
    try {
      const result = await fn();
      return result;
    } finally {
      perfTrace.stop();
    }
  },

  /**
   * Measure execution time of a sync function
   * @param name Name of the trace
   * @param fn Function to execute
   */
  measureSync: <T>(name: string, fn: () => T): T => {
    if (!perf) return fn();
    const perfTrace = trace(perf, name);
    perfTrace.start();
    try {
      const result = fn();
      return result;
    } finally {
      perfTrace.stop();
    }
  },

  /**
   * Start a custom trace manually. Don't forget to call .stop()!
   * @param name Name of the trace
   */
  startTrace: (name: string) => {
    if (!perf) return { stop: () => {} } as any;
    const perfTrace = trace(perf, name);
    perfTrace.start();
    return perfTrace;
  },
};
