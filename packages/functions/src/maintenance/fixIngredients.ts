import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Valid unit types
const VALID_UNITS = ['kg', 'g', 'L', 'ml', 'un', 'manojo'];

// Valid categories
const VALID_CATEGORIES = [
  'meat',
  'fish',
  'produce',
  'dairy',
  'dry',
  'frozen',
  'canned',
  'cocktail',
  'sports_menu',
  'corporate_menu',
  'coffee_break',
  'restaurant',
  'other',
  'preparation',
];

export const fixIngredientsData = onCall(
  {
    cors: true,
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    // TODO: Add admin check here if needed
    // const userDoc = await admin.firestore().collection('users').doc(uid).get();
    // if (userDoc.data()?.role !== 'admin') {
    //   throw new HttpsError('permission-denied', 'Only admins can run this operation.');
    // }

    const db = admin.firestore();
    const ingredientsRef = db.collection('ingredients');
    const snapshot = await ingredientsRef.get();

    let fixed = 0;
    let deleted = 0;
    let skipped = 0;

    const batch = db.batch();
    let operationCount = 0;

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const updates: any = {};
      let needsUpdate = false;
      let shouldDelete = false;

      // Check if ingredient has a valid name
      if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        batch.delete(docSnapshot.ref);
        deleted++;
        operationCount++;
        shouldDelete = true;
      }

      if (shouldDelete) {
        if (operationCount >= 500) {
          await batch.commit();
          operationCount = 0;
        }
        continue;
      }

      // Fix unit field
      if (data.unit) {
        const unitLower = String(data.unit).toLowerCase().trim();

        // Normalize common variations
        let normalizedUnit = unitLower;
        if (['ud', 'u', 'u.', 'uni', 'unidad'].includes(unitLower)) {
          normalizedUnit = 'un';
        } else if (unitLower === 'kilo' || unitLower === 'kilos') {
          normalizedUnit = 'kg';
        } else if (unitLower === 'litro' || unitLower === 'litros') {
          normalizedUnit = 'L';
        } else if (unitLower === 'gramo' || unitLower === 'gramos') {
          normalizedUnit = 'g';
        }

        // If still not valid, default to 'un'
        if (!VALID_UNITS.includes(normalizedUnit)) {
          normalizedUnit = 'un';
        }

        if (normalizedUnit !== data.unit) {
          updates.unit = normalizedUnit;
          needsUpdate = true;
        }
      } else {
        updates.unit = 'un';
        needsUpdate = true;
      }

      // Fix category field
      if (data.category) {
        const categoryLower = String(data.category).toLowerCase().trim();

        if (!VALID_CATEGORIES.includes(categoryLower)) {
          updates.category = 'other';
          needsUpdate = true;
        }
      } else {
        updates.category = 'other';
        needsUpdate = true;
      }

      // Ensure yieldFactor exists and is valid
      if (typeof data.yieldFactor !== 'number' || data.yieldFactor <= 0 || data.yieldFactor > 1) {
        updates.yieldFactor = 1;
        needsUpdate = true;
      }

      // Ensure allergens is an array
      if (!Array.isArray(data.allergens)) {
        updates.allergens = [];
        needsUpdate = true;
      }

      // Ensure isActive is boolean
      if (typeof data.isActive !== 'boolean') {
        updates.isActive = true;
        needsUpdate = true;
      }

      // Ensure suppliers is an array
      if (!Array.isArray(data.suppliers)) {
        updates.suppliers = [];
        needsUpdate = true;
      }

      // Fix currentStock structure
      if (!data.currentStock || typeof data.currentStock !== 'object') {
        updates.currentStock = {
          value: data.stock || 0,
          unit: updates.unit || data.unit || 'un',
        };
        needsUpdate = true;
      } else if (typeof data.currentStock.value !== 'number') {
        updates.currentStock = {
          ...data.currentStock,
          value: 0,
        };
        needsUpdate = true;
      }

      // Fix minimumStock structure
      if (!data.minimumStock || typeof data.minimumStock !== 'object') {
        updates.minimumStock = {
          value: 0,
          unit: updates.unit || data.unit || 'un',
        };
        needsUpdate = true;
      }

      // Fix price fields
      if (data.costPerUnit && typeof data.costPerUnit === 'number') {
        if (!data.lastCost || typeof data.lastCost !== 'object') {
          updates.lastCost = {
            amount: data.costPerUnit,
            currency: 'EUR',
          };
          needsUpdate = true;
        }

        if (!data.averageCost || typeof data.averageCost !== 'object') {
          updates.averageCost = {
            amount: data.costPerUnit,
            currency: 'EUR',
          };
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        batch.update(docSnapshot.ref, {
          ...updates,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        fixed++;
        operationCount++;
      } else {
        skipped++;
      }

      // Commit batch every 500 operations
      if (operationCount >= 500) {
        await batch.commit();
        operationCount = 0;
      }
    }

    // Commit remaining operations
    if (operationCount > 0) {
      await batch.commit();
    }

    return {
      success: true,
      total: snapshot.size,
      fixed,
      deleted,
      skipped,
    };
  }
);
