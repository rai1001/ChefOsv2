/**
 * Script para arreglar datos corruptos en Firestore
 * Problema: Los campos 'unit' tienen números en lugar de UnitType strings
 */

import * as admin from 'firebase-admin';
import { UnitType } from '../packages/core/src/domain/value-objects/Unit';

// Inicializar Firebase Admin
const serviceAccount = require('../serviceAccountKey.json'); // Necesitas este archivo

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

interface IngredientDoc {
  unit?: any;
  [key: string]: any;
}

async function fixIngredientsUnits() {
  console.log('🔍 Buscando ingredientes con unit corrupto...');

  const ingredientsRef = db.collection('ingredients');
  const snapshot = await ingredientsRef.get();

  let fixedCount = 0;
  let errorCount = 0;

  const batch = db.batch();
  let batchCount = 0;
  const BATCH_LIMIT = 500;

  for (const doc of snapshot.docs) {
    const data = doc.data() as IngredientDoc;

    // Si unit es un número o no es un string válido de UnitType
    if (typeof data.unit === 'number' || (typeof data.unit === 'string' && !Object.values(UnitType).includes(data.unit as UnitType))) {
      console.log(`❌ Documento ${doc.id}: unit corrupto = ${data.unit}`);

      // Estrategia: defaultear a 'ud' (UNIT)
      // Puedes cambiar esto si tienes una mejor heurística
      const defaultUnit = UnitType.UNIT;

      batch.update(doc.ref, { unit: defaultUnit });
      batchCount++;
      fixedCount++;

      console.log(`✅ Fijado a: ${defaultUnit}`);

      // Commit batch cada 500 documentos
      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        console.log(`💾 Batch de ${batchCount} documentos commiteado`);
        batchCount = 0;
      }
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
    console.log(`💾 Batch final de ${batchCount} documentos commiteado`);
  }

  console.log(`\n✅ Arreglados: ${fixedCount}`);
  console.log(`❌ Errores: ${errorCount}`);
  console.log(`📊 Total revisados: ${snapshot.size}`);
}

async function fixRecipesUnits() {
  console.log('\n🔍 Buscando recetas con units corruptos...');

  const recipesRef = db.collection('recipes');
  const snapshot = await recipesRef.get();

  let fixedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    let needsUpdate = false;
    const updates: any = {};

    // Revisar ingredients array
    if (data.ingredients && Array.isArray(data.ingredients)) {
      const fixedIngredients = data.ingredients.map((ing: any) => {
        if (typeof ing.unit === 'number' || (typeof ing.unit === 'string' && !Object.values(UnitType).includes(ing.unit as UnitType))) {
          console.log(`❌ Receta ${doc.id}: ingredient unit corrupto = ${ing.unit}`);
          needsUpdate = true;
          return { ...ing, unit: UnitType.UNIT };
        }
        return ing;
      });

      if (needsUpdate) {
        updates.ingredients = fixedIngredients;
      }
    }

    if (needsUpdate) {
      await doc.ref.update(updates);
      fixedCount++;
      console.log(`✅ Receta ${doc.id} arreglada`);
    }
  }

  console.log(`\n✅ Recetas arregladas: ${fixedCount}`);
}

async function fixFichasTecnicasUnits() {
  console.log('\n🔍 Buscando fichas técnicas con units corruptos...');

  const fichasRef = db.collection('fichasTecnicas');
  const snapshot = await fichasRef.get();

  let fixedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    let needsUpdate = false;
    const updates: any = {};

    // Revisar ingredientes array
    if (data.ingredientes && Array.isArray(data.ingredientes)) {
      const fixedIngredients = data.ingredientes.map((ing: any) => {
        if (typeof ing.unidad === 'number' || (typeof ing.unidad === 'string' && !Object.values(UnitType).includes(ing.unidad as UnitType))) {
          console.log(`❌ Ficha ${doc.id}: ingredient unit corrupto = ${ing.unidad}`);
          needsUpdate = true;
          return { ...ing, unidad: UnitType.UNIT };
        }
        return ing;
      });

      if (needsUpdate) {
        updates.ingredientes = fixedIngredients;
      }
    }

    if (needsUpdate) {
      await doc.ref.update(updates);
      fixedCount++;
      console.log(`✅ Ficha ${doc.id} arreglada`);
    }
  }

  console.log(`\n✅ Fichas técnicas arregladas: ${fixedCount}`);
}

async function main() {
  try {
    console.log('🚀 Iniciando limpieza de datos de Firestore...\n');

    await fixIngredientsUnits();
    await fixRecipesUnits();
    await fixFichasTecnicasUnits();

    console.log('\n✨ Limpieza completada exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  }
}

main();
