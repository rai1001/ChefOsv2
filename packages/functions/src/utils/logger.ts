import * as logger from 'firebase-functions/logger';

/**
 * Enhanced logger for Firebase Functions to ensure structured logging.
 */
export const logInfo = (message: string, data?: object) => {
  logger.info(message, { ...data, timestamp: new Date().toISOString() });
};

export const logError = (message: string, error?: any, data?: object) => {
  logger.error(message, {
    ...data,
    error:
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : error,
    timestamp: new Date().toISOString(),
  });
};

export const logWarn = (message: string, data?: object) => {
  logger.warn(message, { ...data, timestamp: new Date().toISOString() });
};

export const logDebug = (message: string, data?: object) => {
  logger.debug(message, { ...data, timestamp: new Date().toISOString() });
};
