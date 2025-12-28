import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { VertexAI } from '@google-cloud/vertexai';
import { logError } from '../utils/logger';
import { checkRateLimit } from '../utils/rateLimiter';

// Standardizing interfaces for internal use
interface Batch {
  id: string;
  expiresAt: string; // ISO date
  currentQuantity: number;
  initialQuantity: number;
  unit: string;
  ingredientId?: string;
  name?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  batches?: Batch[];
  category?: string;
}

interface WasteSuggestionsData {
  outletId: string;
}

export const getWasteSuggestions = onCall<WasteSuggestionsData>(async (request) => {
  // 1. Auth Check & Rate Limiting
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }
  await checkRateLimit(uid, 'get_waste_suggestions');

  const { outletId } = request.data;
  if (!outletId) {
    throw new HttpsError('invalid-argument', 'Outlet ID is required.');
  }

  try {
    const db = admin.firestore();
    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // 2. Fetch Inventory
    const inventorySnapshot = await db
      .collection('inventory')
      .where('outletId', '==', outletId)
      .get();

    const expiringItems: {
      batchId: string;
      ingredientId: string;
      name: string;
      quantity: number;
      unit: string;
      expiresAt: string;
      hoursLeft: number;
    }[] = [];

    inventorySnapshot.forEach((doc) => {
      const item = doc.data() as InventoryItem;
      if (item.batches && Array.isArray(item.batches)) {
        item.batches.forEach((batch) => {
          if (batch.currentQuantity > 0 && batch.expiresAt) {
            const expiryDate = new Date(batch.expiresAt);
            if (expiryDate <= fortyEightHoursFromNow && expiryDate >= now) {
              const hoursLeft = Math.floor(
                (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60)
              );
              expiringItems.push({
                batchId: batch.id,
                ingredientId: item.id,
                name: item.name,
                quantity: batch.currentQuantity,
                unit: item.unit,
                expiresAt: batch.expiresAt,
                hoursLeft: hoursLeft,
              });
            }
          }
        });
      }
    });

    if (expiringItems.length === 0) {
      return { suggestions: [] };
    }

    const topExpiring = expiringItems.sort((a, b) => a.hoursLeft - b.hoursLeft).slice(0, 5);

    // 3. AI Analysis with Gemini
    const projectId = process.env.GCLOUD_PROJECT;
    if (!projectId) {
      logError('GCLOUD_PROJECT not set.');
      throw new HttpsError('internal', 'Server configuration error.');
    }
    const vertexAI = new VertexAI({ project: projectId, location: 'europe-west1' });
    const model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
        You are a Pragmatic Executive Chef focused on Zero Waste.
        Here is a list of ingredients expiring within 48 hours:
        ${JSON.stringify(topExpiring)}

        Analyze each item and suggest the BEST immediate action to avoid waste.
        Return a stricter JSON array without markdown formatting.
        Possible actions:
        - FLASH_SALE: Sell immediately at discount.
        - BUFFET: Use in today's buffet/staff meal.
        - PRESERVE: Cook/Freeze/Pickle to extend life.

        JSON Format required:
        [
          {
            "batchId": "string (from input)",
            "ingredientId": "string (from input)",
            "ingredientName": "string",
            "quantity": number,
            "unit": "string",
            "expiresInHours": number,
            "suggestedAction": "FLASH_SALE" | "BUFFET" | "PRESERVE",
            "reasoning": "Short pragmatic chef advice (max 15 words)",
            "recipeName": "Suggested dish name (if applicable)",
            "discountPercentage": number (only for FLASH_SALE, e.g. 50)
          }
        ]
        `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) throw new Error('AI returned empty response');

    const jsonString = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    const suggestions = JSON.parse(jsonString);

    return { suggestions };
  } catch (error: any) {
    logError('Error in getWasteSuggestions:', error, { outletId });
    throw new HttpsError('internal', error.message);
  }
});

export const applyWasteAction = onCall<any>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Login required.');
  await checkRateLimit(uid, 'apply_waste_action');

  return { success: true };
});
