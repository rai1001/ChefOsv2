import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { enrichIngredientWithAI } from '../utils/ai';
import { logError } from '../utils/logger';
import { checkRateLimit } from '../utils/rateLimiter';
import { getCachedResult, setCachedResult } from '../cache/aiCache';

/**
 * Enrich Ingredient with AI + Caching
 *
 * Cost optimization: Check cache before calling Gemini
 * - 50-70% cache hit rate expected
 * - Saves €1.50-4.00/month
 */
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
    // Check cache first
    const cached = await getCachedResult('ingredient_classification', name);
    if (cached) {
      console.log('[Ingredient Enricher] Using cached result for:', name);
      return cached;
    }

    // Cache miss - call AI
    console.log('[Ingredient Enricher] Calling AI for:', name);
    const result = await enrichIngredientWithAI(name);

    // Store in cache for 30 days
    await setCachedResult('ingredient_classification', name, result);

    return result;
  } catch (error: any) {
    logError('Enrichment Error:', error, { uid, name });
    throw new HttpsError('internal', 'Failed to enrich ingredient.');
  }
});
