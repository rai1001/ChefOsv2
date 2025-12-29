import { AppError, ErrorCode } from '@culinaryos/core';

/**
 * Handle errors centrally on the frontend.
 * Maps technical errors to user-friendly messages.
 */
export const handleError = (error: unknown): { message: string; code: string } => {
  console.error('[Global Error Handler]:', error);

  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
    };
  }

  // Firebase Auth / Firestore specific errors if needed
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const fbError = error as { code: string };
    switch (fbError.code) {
      case 'permission-denied':
        return {
          message: 'No tienes permiso para realizar esta acción.',
          code: ErrorCode.UNAUTHORIZED,
        };
      case 'unavailable':
        return {
          message: 'El servicio no está disponible temporalmente.',
          code: ErrorCode.INTERNAL_ERROR,
        };
      default:
        break;
    }
  }

  const message = error instanceof Error ? error.message : 'Ha ocurrido un error inesperado.';
  return {
    message: message,
    code: ErrorCode.INTERNAL_ERROR,
  };
};
