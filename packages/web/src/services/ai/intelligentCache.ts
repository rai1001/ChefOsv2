import { db } from '@/config/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import type { AIFeature } from './types';

// TTL Definitions (in hours)
const CACHE_TTL: Record<AIFeature, number> = {
  invoiceScanner: 24,
  beoScanner: 12,
  sportsMenuScanner: 6,
  zeroWasteEngine: 1,
  universalImporter: 24,
  inventoryOptimization: 4,
  purchaseSuggestion: 4,
  wasteAnalysis: 4,
  inventoryScanner: 24,
  haccpScanner: 24,
  menuGenerator: 24,
};

async function generateHash(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a SHA-256 hash key for caching based on feature and input.
 * @param feature The AI feature.
 * @param input The input data (string or object).
 * @returns SHA-256 hash string.
 */
export async function generateCacheKey(feature: AIFeature, input: any): Promise<string> {
  const inputString = typeof input === 'string' ? input : JSON.stringify(input);
  const hash = await generateHash(`${feature}:${inputString}`);
  return hash;
}

/**
 * Retrieves a cached result if it exists and hasn't expired.
 * Updates the hit count asynchronously.
 * @param key The cache key.
 * @returns The cached result or null.
 */
export async function getCachedResult<T>(key: string): Promise<T | null> {
  try {
    const docRef = doc(db, 'aiCache', key);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const expiresAt =
        data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : new Date(data.expiresAt);
      const now = new Date();

      if (now < expiresAt) {
        // Update hit count asynchronously (fire and forget)
        setDoc(docRef, { hitCount: (data.hitCount || 0) + 1 }, { merge: true }).catch(
          console.error
        );
        return data.result as T;
      }
    }
    return null;
  } catch (e) {
    console.warn('Cache lookup failed', e);
    return null;
  }
}

/**
 * Stores a result in the cache with a TTL based on the feature.
 * @param key The cache key.
 * @param feature The AI feature (determines TTL).
 * @param input The input data (stored for debugging/audit, truncated if large).
 * @param result The result to cache.
 */
export async function setCachedResult(
  key: string,
  feature: AIFeature,
  input: any,
  result: any
): Promise<void> {
  try {
    const ttlHours = CACHE_TTL[feature] || 24;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    // Avoid storing large inputs (like base64 images)
    let inputToStore = input;
    if (typeof input === 'string' && input.length > 500) {
      inputToStore = { type: 'string', length: input.length, preview: input.substring(0, 100) };
    } else if (typeof input === 'object' && input !== null) {
      // Shallow check for large strings in object
      inputToStore = { ...input };
      for (const k in inputToStore) {
        if (typeof inputToStore[k] === 'string' && inputToStore[k].length > 500) {
          inputToStore[k] = `[Large string: ${inputToStore[k].length} chars]`;
        }
      }
    }

    await setDoc(doc(db, 'aiCache', key), {
      hash: key,
      feature,
      input: inputToStore,
      result,
      createdAt: now,
      expiresAt,
      hitCount: 0,
    });
  } catch (e) {
    console.warn('Cache set failed', e);
  }
}
