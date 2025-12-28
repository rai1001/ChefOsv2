import { rtdb, db } from '@/config/firebase';
import { ref, push, set } from 'firebase/database';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import type { AIFeature, AIMetrics, AICallMetadata } from './types';
import { checkBudgetBeforeCall, updateUsageAfterCall } from './budgetManager';
import { getCachedResult, setCachedResult, generateCacheKey } from './intelligentCache';
import { performanceUtils } from '@/utils/performance';

// Pricing Constants (Gemini 2.0 Flash)
// Pricing Constants (Gemini 2.0 Flash - Actual rates per 1M tokens as of 2025)
const COST_PER_1M_INPUT_TOKENS = 0.1; // $0.10 per 1M tokens
const COST_PER_1M_OUTPUT_TOKENS = 0.4; // $0.40 per 1M tokens
const COST_PER_TOKEN_INPUT = COST_PER_1M_INPUT_TOKENS / 1_000_000;

/**
 * Estimates the number of tokens for text and image inputs.
 * @param text The input text string.
 * @param imageBytes The size of the image in bytes (default 0).
 * @returns Estimated number of tokens.
 */
function estimateTokens(text: string, imageBytes: number = 0): number {
  // Rough estimate: 4 chars = 1 token
  const textTokens = text.length / 4;
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
function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = inputTokens * COST_PER_TOKEN_INPUT;
  const outputCost = (outputTokens / 1_000_000) * COST_PER_1M_OUTPUT_TOKENS;
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
  inputPayload?: string | object // Used for Cache Key and Input Token estimation
): Promise<T> {
  const start = performance.now();
  let success = false;
  let result: T | null = null;
  let errorMsg: string | undefined;
  let cacheHit = false;
  let cacheKey = '';

  // 1. Calculate Estimated Input Tokens
  let estimatedInputTokens = 0;
  let inputStringForHash = '';

  if (typeof inputPayload === 'string') {
    inputStringForHash = inputPayload;
    estimatedInputTokens = estimateTokens(inputPayload);
  } else if (typeof inputPayload === 'object' && inputPayload !== null) {
    inputStringForHash = JSON.stringify(inputPayload);
    // Specialized estimation for multimodal payloads
    const payload = inputPayload as any;
    if (payload.imageSize) {
      estimatedInputTokens = estimateTokens(payload.prompt || '', payload.imageSize);
    } else {
      estimatedInputTokens = estimateTokens(inputStringForHash);
    }
  }

  console.log(`[AI Metrics] Starting tracked call: ${feature}`);
  // 1. Check Budget
  try {
    console.log(`[AI Metrics] Checking budget for ${feature}...`);
    const estimatedCost = estimatedInputTokens * COST_PER_TOKEN_INPUT;
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
      const cached = await getCachedResult<T>(cacheKey);
      if (cached) {
        console.log(`[AI Metrics] Cache HIT for ${feature}`);
        cacheHit = true;
        return cached;
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
        const outputTokens = estimateTokens(resultStr);
        const actualCost = calculateCost(estimatedInputTokens, outputTokens);

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
