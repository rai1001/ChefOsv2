const admin = require('firebase-admin');
const serviceAccount = require('../../../chefosv2-firebase-adminsdk-fbsvc-26dc01131f.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Valid unit types
const VALID_UNITS = ['kg', 'g', 'L', 'ml', 'un', 'manojo'];

// Valid categories
const VALID_CATEGORIES = [
  'meat', 'fish', 'produce', 'dairy', 'dry', 'frozen',
  'canned', 'cocktail', 'sports_menu', 'corporate_menu',
  'coffee_break', 'restaurant', 'other', 'preparation'
];

async function fixIngredients() {
  console.log('🔧 Iniciando limpieza de ingredientes...\n');

  const ingredientsRef = db.collection('ingredients');
  const snapshot = await ingredientsRef.get();

  console.log(`📊 Encontrados ${snapshot.size} ingredientes\n`);

  let fixed = 0;
  let deleted = 0;
  let skipped = 0;

  for (let batchStart = 0; batchStart < snapshot.docs.length; batchStart += 500) {
    const batch = db.batch();
    const batchDocs = snapshot.docs.slice(batchStart, batchStart + 500);

    for (const docSnapshot of batchDocs) {
      const data = docSnapshot.data();
      const updates = {};
      let needsUpdate = false;
      let shouldDelete = false;

      // Check if ingredient has a valid name
      if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        console.log(`❌ Eliminando ingrediente ${docSnapshot.id} - nombre inválido`);
        batch.delete(docSnapshot.ref);
        deleted++;
        shouldDelete = true;
      }

      if (shouldDelete) continue;

      // Fix unit field (THIS IS THE KEY FIX FOR YOUR ISSUE!)
      if (data.unit) {
        // Convert to string if it's a number
        const unitStr = String(data.unit);
        const unitLower = unitStr.toLowerCase().trim();
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

        if (!VALID_UNITS.includes(normalizedUnit)) {
          console.log(`⚠️  "${data.name}": unidad inválida "${data.unit}" -> "un"`);
          normalizedUnit = 'un';
        }

        if (normalizedUnit !== data.unit || typeof data.unit !== 'string') {
          updates.unit = normalizedUnit;
          needsUpdate = true;
          if (typeof data.unit === 'number') {
            console.log(`🔢 "${data.name}": unidad numérica ${data.unit} -> "${normalizedUnit}"`);
          }
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

      if (needsUpdate) {
        batch.update(docSnapshot.ref, {
          ...updates,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        fixed++;
      } else {
        skipped++;
      }
    }

    await batch.commit();
    console.log(`✅ Lote ${Math.floor(batchStart / 500) + 1} completado`);
  }

  console.log('\n📈 Resumen:');
  console.log(`✅ Corregidos: ${fixed}`);
  console.log(`❌ Eliminados: ${deleted}`);
  console.log(`⏭️  Sin cambios: ${skipped}`);
  console.log(`📊 Total: ${snapshot.size}\n`);
  console.log('✨ ¡Limpieza completada!');

  process.exit(0);
}

fixIngredients().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
