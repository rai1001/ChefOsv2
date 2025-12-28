import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { enrichIngredientWithAI } from '../utils/ai';
import { logError } from '../utils/logger';
import { checkRateLimit } from '../utils/rateLimiter';

export const enrichIngredientCallable = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Must be logged in.');
  }

  const { name } = request.data;
  if (!name) {
    throw new HttpsError(
      'invalid-argument',
      "The function must be called with an ingredient 'name'."
    );
  }

  await checkRateLimit(uid, 'enrich_ingredient');

  try {
    const result = await enrichIngredientWithAI(name);
    return result;
  } catch (error: any) {
    logError('Enrichment Error:', error, { uid, name });
    throw new HttpsError('internal', 'Failed to enrich ingredient.');
  }
});
