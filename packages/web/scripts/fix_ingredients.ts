import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBNayVOf4y3YY-v8h_qkZFoJbXJZL48xaE',
  authDomain: 'chefosv2.firebaseapp.com',
  projectId: 'chefosv2',
  storageBucket: 'chefosv2.firebasestorage.app',
  messagingSenderId: '1070594452814',
  appId: '1:1070594452814:web:a3a2f396fe91d16ddb9f89',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

async function fixIngredients() {
  console.log('🔧 Starting to fix ingredients...');

  const ingredientsRef = collection(db, 'ingredients');
  const snapshot = await getDocs(ingredientsRef);

  console.log(`📊 Found ${snapshot.size} ingredients to check`);

  let fixed = 0;
  let deleted = 0;
  let skipped = 0;

  for (const docSnapshot of snapshot.docs) {
    const data = docSnapshot.data();
    const updates: any = {};
    let needsUpdate = false;
    let shouldDelete = false;

    // Check if ingredient has a valid name
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      console.log(`❌ Deleting ingredient ${docSnapshot.id} - invalid name:`, data.name);
      shouldDelete = true;
    }

    if (shouldDelete) {
      await deleteDoc(doc(db, 'ingredients', docSnapshot.id));
      deleted++;
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
        console.log(`⚠️  Fixing unit for "${data.name}": "${data.unit}" -> "un"`);
        normalizedUnit = 'un';
      }

      if (normalizedUnit !== data.unit) {
        updates.unit = normalizedUnit;
        needsUpdate = true;
      }
    } else {
      // No unit specified, default to 'un'
      updates.unit = 'un';
      needsUpdate = true;
    }

    // Fix category field
    if (data.category) {
      const categoryLower = String(data.category).toLowerCase().trim();

      if (!VALID_CATEGORIES.includes(categoryLower)) {
        console.log(`⚠️  Fixing category for "${data.name}": "${data.category}" -> "other"`);
        updates.category = 'other';
        needsUpdate = true;
      }
    } else {
      // No category specified, default to 'other'
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
      try {
        await updateDoc(doc(db, 'ingredients', docSnapshot.id), updates);
        fixed++;
        if (fixed % 10 === 0) {
          console.log(`✅ Fixed ${fixed} ingredients so far...`);
        }
      } catch (error) {
        console.error(`❌ Error fixing ingredient ${docSnapshot.id}:`, error);
      }
    } else {
      skipped++;
    }
  }

  console.log('\n📈 Summary:');
  console.log(`✅ Fixed: ${fixed}`);
  console.log(`❌ Deleted: ${deleted}`);
  console.log(`⏭️  Skipped (already valid): ${skipped}`);
  console.log(`📊 Total: ${snapshot.size}`);
}

fixIngredients()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
