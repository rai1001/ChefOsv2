import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { logWarn } from './logger';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute
};

/**
 * Basic rate limiter using Firestore.
 * Tracks requests per UID in a window.
 */
export async function checkRateLimit(
  uid: string,
  action: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<void> {
  const db = admin.firestore();
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const rateLimitRef = db.collection('rateLimits').doc(`${uid}_${action}`);

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(rateLimitRef);
    const data = doc.data();

    if (!doc.exists || !data || (data.lastReset || 0) < windowStart) {
      // New window
      transaction.set(rateLimitRef, {
        count: 1,
        lastReset: now,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Within current window
      if (data?.count >= config.maxRequests) {
        logWarn(`Rate limit exceeded for user ${uid} on action ${action}`);
        throw new HttpsError('resource-exhausted', 'Too many requests. Please try again later.');
      }

      transaction.update(rateLimitRef, {
        count: data.count + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
}
