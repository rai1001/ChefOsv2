// import { db } from '@/config/firebase';
// import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: any;
  context?: any;
  uid?: string;
  path?: string;
}

export class LoggingService {
  private static collectionName = 'logs';

  static async log(level: LogLevel, message: string, context?: any) {
    console[level](`[${level.toUpperCase()}] ${message}`, context || '');

    // try {
    //   const entry: LogEntry = {
    //     level,
    //     message,
    //     timestamp: serverTimestamp(),
    //     context: context ? this.sanitizeContext(context) : null,
    //     uid: window.localStorage.getItem('uid') || 'anonymous',
    //     path: window.location.pathname,
    //   };

    //   await addDoc(collection(db, this.collectionName), entry);
    // } catch (err) {
    //   console.error('Failed to write log to Firestore:', err);
    // }
  }

  static async info(message: string, context?: any) {
    return this.log(LogLevel.INFO, message, context);
  }

  static async warn(message: string, context?: any) {
    return this.log(LogLevel.WARN, message, context);
  }

  static async error(message: string, context?: any) {
    return this.log(LogLevel.ERROR, message, context);
  }

  static async debug(message: string, context?: any) {
    return this.log(LogLevel.DEBUG, message, context);
  }

  private static sanitizeContext(context: any): any {
    try {
      // Basic sanitization to avoid circular references and non-serializable data
      const seen = new Set();
      return JSON.parse(
        JSON.stringify(context, (_key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular]';
            }
            seen.add(value);
          }
          if (value instanceof Error) {
            return {
              name: value.name,
              message: value.message,
              stack: value.stack,
            };
          }
          return value;
        })
      );
    } catch (e) {
      return { error: 'Failed to sanitize context', originalType: typeof context };
    }
  }
}
