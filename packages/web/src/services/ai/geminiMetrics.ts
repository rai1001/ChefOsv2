import { rtdb, db } from '@/config/firebase';
import { ref, push, set } from 'firebase/database';
import { collection, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import type { AIFeature, AIMetrics, AICallMetadata } from './types';
import { checkBudgetBeforeCall, updateUsageAfterCall } from './budgetManager';
import { getCachedResult, setCachedResult, generateCacheKey } from './intelligentCache';
import { performanceUtils } from '@/utils/performance';

// Pricing Constants (Gemini 2.0 Flash - Fallback rates per 1M tokens)
const DEFAULT_INPUT_COST_PER_1M = 0.1;
const DEFAULT_OUTPUT_COST_PER_1M = 0.4;
const DEFAULT_SPANISH_MULTIPLIER = 3.2; // Updated from 2.0 to 3.2 as per P2 requirements

interface PricingConfig {
  inputCostPer1M: number;
  outputCostPer1M: number;
  spanishMultiplier: number;
}

let cachedPricing: PricingConfig | null = null;
let lastFetchTime = 0;
const PRICING_CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function getPricingConfig(): Promise<PricingConfig> {
  const now = Date.now();
  if (cachedPricing && now - lastFetchTime < PRICING_CACHE_TTL) {
    return cachedPricing;
  }

  try {
    const pricingDoc = await getDoc(doc(db, 'aiConfiguration', 'pricing'));
    if (pricingDoc.exists()) {
      const data = pricingDoc.data();
      cachedPricing = {
        inputCostPer1M: data.inputCostPer1M ?? DEFAULT_INPUT_COST_PER_1M,
        outputCostPer1M: data.outputCostPer1M ?? DEFAULT_OUTPUT_COST_PER_1M,
        spanishMultiplier: data.spanishMultiplier ?? DEFAULT_SPANISH_MULTIPLIER,
      };
      lastFetchTime = now;
      return cachedPricing!;
    }
  } catch (e) {
    console.warn('[AI Metrics] Failed to fetch pricing from Firestore, using defaults', e);
  }

  return {
    inputCostPer1M: DEFAULT_INPUT_COST_PER_1M,
    outputCostPer1M: DEFAULT_OUTPUT_COST_PER_1M,
    spanishMultiplier: DEFAULT_SPANISH_MULTIPLIER,
  };
}

/**
 * Estimates the number of tokens for text and image inputs.
 * @param text The input text string.
 * @param imageBytes The size of the image in bytes (default 0).
 * @returns Estimated number of tokens.
 */
function estimateTokens(text: string, imageBytes: number = 0, multiplier: number = 3.2): number {
  // Rough estimate: Spanish to English token ratio is higher
  // Base estimate: 4 chars = 1 token
  const baseTokens = text.length / 4;
  const textTokens = baseTokens * multiplier;

  // Prompt formula: (imageBytes / 750)
  const imageTokens = imageBytes / 750;
  return Math.ceil(textTokens + imageTokens);
}

/**
 * Calculates the estimated cost based on input and output tokens.
 * @param inputTokens Number of input tokens.
 * @param outputTokens Number of output tokens.
 * @returns Estimated cost in USD.
 */
/**
 * Calculates the estimated cost based on input and output tokens.
 */
function calculateCost(inputTokens: number, outputTokens: number, pricing: PricingConfig): number {
  const inputCost = (inputTokens / 1_000_000) * pricing.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputCostPer1M;
  return inputCost + outputCost;
}

// Log to RTDB (HOT)
async function logMetricToRealtime(metric: AIMetrics) {
  try {
    const date = new Date(metric.timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Path: /ai_metrics/{outletId}/{year}/{month}/{day}/{callId}
    const metricsRef = ref(rtdb, `ai_metrics/${metric.outletId}/${year}/${month}/${day}`);
    const newMetricRef = push(metricsRef);
    await set(newMetricRef, metric);
  } catch (e) {
    console.error('Failed to log to RTDB', e);
  }
}

// Log to Firestore (COLD)
async function logMetricToFirestore(metric: AIMetrics) {
  try {
    await addDoc(collection(db, 'aiUsageMetrics'), {
      ...metric,
      timestamp: Timestamp.fromDate(new Date(metric.timestamp)),
    });
  } catch (e) {
    console.error('Failed to log to Firestore', e);
  }
}

/**
 * Wraps a Gemini API call with metrics tracking, budget enforcement, and caching.
 * @param feature The specific AI feature being used (e.g., 'invoiceScanner').
 * @param operation The async operation (API call) to execute.
 * @param metadata Metadata about the call (outletId, userId).
 * @param inputPayload The input data (string or object) used for token estimation and cache key generation.
 * @returns The result of the operation.
 * @throws {BudgetExceededError} If the budget limit is reached.
 */
export async function trackedGeminiCall<T>(
  feature: AIFeature,
  operation: () => Promise<T>,
  metadata: AICallMetadata,
  inputPayload?: string | object, // Used for Cache Key and Input Token estimation
  options?: import('@/domain/interfaces/services/IAIService').AIRequestOptions
): Promise<T> {
  const start = performance.now();
  let success = false;
  let result: T | null = null;
  let errorMsg: string | undefined;
  let cacheHit = false;
  let cacheKey = '';

  // 0. Fetch Pricing Configuration
  const pricing = await getPricingConfig();

  // 1. Calculate Estimated Input Tokens
  let estimatedInputTokens = 0;
  let inputStringForHash = '';

  if (typeof inputPayload === 'string') {
    inputStringForHash = inputPayload;
    estimatedInputTokens = estimateTokens(inputPayload, 0, pricing.spanishMultiplier);
  } else if (typeof inputPayload === 'object' && inputPayload !== null) {
    inputStringForHash = JSON.stringify(inputPayload);
    // Specialized estimation for multimodal payloads
    const payload = inputPayload as any;
    if (payload.imageSize) {
      estimatedInputTokens = estimateTokens(
        payload.prompt || '',
        payload.imageSize,
        pricing.spanishMultiplier
      );
    } else {
      estimatedInputTokens = estimateTokens(inputStringForHash, 0, pricing.spanishMultiplier);
    }
  }

  console.log(`[AI Metrics] Starting tracked call: ${feature}`);
  // 1. Check Budget
  try {
    console.log(`[AI Metrics] Checking budget for ${feature}...`);
    const costPerTokenInput = pricing.inputCostPer1M / 1_000_000;
    const estimatedCost = estimatedInputTokens * costPerTokenInput;
    const budget = await checkBudgetBeforeCall(metadata.outletId, feature, estimatedCost);
    console.log(`[AI Metrics] Budget check result for ${feature}:`, {
      allowed: budget.allowed,
      estimatedTokens: estimatedInputTokens,
      estimatedCost: estimatedCost.toFixed(6),
    });
    if (!budget || !budget.allowed) {
      throw new Error(budget?.errorMessage || `Budget exceeded for feature: ${feature}`);
    }
  } catch (e: any) {
    console.error(`[AI Metrics] Budget check ERROR:`, e);
    throw e;
  }

  // Generate cache key early if possible
  if (inputStringForHash) {
    cacheKey = await generateCacheKey(feature, inputPayload);
  }

  // 2. Check Cache
  if (cacheKey) {
    try {
      console.log(`[AI Metrics] Checking cache for ${feature}...`);
      const isForceRefresh = (options as any)?.forceRefresh === true;
      const cached = await getCachedResult<T>(cacheKey, isForceRefresh);
      if (cached) {
        console.log(`[AI Metrics] Cache HIT for ${feature}`);
        cacheHit = true;
        return cached as T;
      }
      console.log(`[AI Metrics] Cache MISS for ${feature}`);
    } catch (e) {
      console.warn(`[AI Metrics] Cache check failed (non-fatal):`, e);
    }
  }

  // 4. Perform Operation
  try {
    console.log(`[AI Metrics] Executing operation for ${feature}...`);
    if (typeof operation !== 'function') {
      console.error(`[AI Metrics] OPERATION IS NOT A FUNCTION for ${feature}`, operation);
    }

    result = await performanceUtils.measureAsync(`ai_call_${feature}`, operation);

    console.log(`[AI Metrics] Operation finished for ${feature}. result exists: ${!!result}`);

    if (result === undefined || result === null) {
      console.error(`[AI Metrics] Operation for ${feature} returned NULL/UNDEFINED`);
      throw new Error(`AI operation for ${feature} returned no result`);
    }

    // Defensive check for .success if result is an object
    if (typeof result === 'object' && result !== null) {
      console.log(`[AI Metrics] result keys:`, Object.keys(result));
      // TRAP: Is something reading .success here?
      try {
        const s = (result as any).success;
        console.log(`[AI Metrics] result.success value:`, s);
      } catch (e) {
        console.warn(`[AI Metrics] Non-fatal error reading .success from result:`, e);
      }
    }

    success = true;
    return result as T;
  } catch (error: any) {
    console.error(`[AI Metrics] Operation FAILED for ${feature}:`, error);
    if (error instanceof TypeError && error.message.includes('success')) {
      console.error(
        `[AI Metrics] DETECTED TYPEERROR (reading success) for ${feature}. Check callback return type.`
      );
    }
    success = false;
    errorMsg = error.message;
    throw error;
  } finally {
    console.log(
      `[AI Metrics] Entering finally block for ${feature}. Success: ${success}, CacheHit: ${cacheHit}`
    );
    if (!cacheHit) {
      try {
        const end = performance.now();
        const latency = end - start;

        // Calculate actual tokens (defensive check)
        let resultStr = '';
        try {
          resultStr = result ? JSON.stringify(result) : '';
        } catch (e) {
          console.warn('[AI Metrics] Failed to stringify result for token estimation', e);
        }
        const outputTokens = estimateTokens(resultStr, 0, pricing.spanishMultiplier);
        const actualCost = calculateCost(estimatedInputTokens, outputTokens, pricing);

        const metric: AIMetrics = {
          timestamp: new Date().toISOString(),
          outletId: metadata?.outletId || 'unknown',
          userId: metadata?.userId || 'unknown',
          feature,
          inputTokens: estimatedInputTokens,
          outputTokens,
          estimatedCost: actualCost,
          latencyMs: latency,
          success,
          errorMessage: errorMsg,
          model: 'gemini-2.0-flash',
        };

        console.log(`[AI Metrics] Logging metric for ${feature}:`, metric);

        // Log Metrics (Async - Fire and Forget)
        logMetricToRealtime(metric).catch((err) =>
          console.error('[AI Metrics] RTDB Log Error:', err)
        );
        logMetricToFirestore(metric).catch((err) =>
          console.error('[AI Metrics] Firestore Log Error:', err)
        );

        if (success) {
          updateUsageAfterCall(metadata.outletId, actualCost, feature).catch((err) =>
            console.error('[AI Metrics] Budget Update Error:', err)
          );
          if (result && cacheKey) {
            setCachedResult(cacheKey, feature, inputPayload, result).catch((err) =>
              console.error('[AI Metrics] Cache Set Error:', err)
            );
          }
        }
      } catch (finalError) {
        console.error(`[AI Metrics] CRITICAL Error in finally block:`, finalError);
      }
    }
  }
}
