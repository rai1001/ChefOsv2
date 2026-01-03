// import { db } from '@/config/firebase';
// import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
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
  ocrScanner: 24,
  menuGenerator: 24,
};

// Basic prompt versioning to invalidate cache when prompts change
const PROMPT_VERSION = 'v1';

async function generateHash(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a SHA-256 hash key for caching based on feature, input, and PROMPT_VERSION.
 * @param feature The AI feature.
 * @param input The input data (string or object).
 * @returns SHA-256 hash string.
 */
export async function generateCacheKey(feature: AIFeature, input: any): Promise<string> {
  const inputString = typeof input === 'string' ? input : JSON.stringify(input);
  // Include PROMPT_VERSION in hash to invalidate old entries when logic changes
  const hash = await generateHash(`${feature}:${PROMPT_VERSION}:${inputString}`);
  return hash;
}

/**
 * Retrieves a cached result if it exists and hasn't expired.
 * Updates the hit count asynchronously.
 * @param key The cache key.
 * @param forceRefresh If true, ignores cache and returns null (forcing new AI call).
 * @returns The cached result or null.
 */
export async function getCachedResult<T>(
  key: string,
  forceRefresh: boolean = false
): Promise<T | null> {
  // Stubbed: Cache disabled
  return null;
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
  // Stubbed: Cache disabled
  // console.log('Cache set (stubbed):', key);
}

/**
 * Manually invalidates a cache entry.
 * @param key The cache key to invalidate.
 */
export async function invalidateCache(key: string): Promise<void> {
  // Stubbed: Cache disabled
  // console.log('Cache invalidated (stubbed):', key);
}
