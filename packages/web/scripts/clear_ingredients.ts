/**
 * Script to delete all ingredients from Firestore
 * Use this to clean up corrupted data and start fresh
 *
 * Run with: npx tsx scripts/clear_ingredients.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Firebase config (same as in your app)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearIngredients() {
  console.log('🧹 Starting to clear ingredients collection...');

  try {
    const ingredientsRef = collection(db, 'ingredients');
    const snapshot = await getDocs(ingredientsRef);

    console.log(`📊 Found ${snapshot.size} ingredients to delete`);

    if (snapshot.size === 0) {
      console.log('✅ No ingredients to delete');
      return;
    }

    // Confirm before deleting
    console.log('⚠️  WARNING: This will delete ALL ingredients!');
    console.log('Press Ctrl+C now to cancel...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    let deleted = 0;
    const batch = [];

    for (const docSnap of snapshot.docs) {
      batch.push(deleteDoc(doc(db, 'ingredients', docSnap.id)));
      deleted++;

      if (deleted % 10 === 0) {
        console.log(`🗑️  Deleted ${deleted}/${snapshot.size} ingredients...`);
      }
    }

    await Promise.all(batch);

    console.log(`✅ Successfully deleted ${deleted} ingredients!`);
    console.log('🎉 Ingredients collection is now empty');
  } catch (error) {
    console.error('❌ Error clearing ingredients:', error);
    process.exit(1);
  }

  process.exit(0);
}

clearIngredients();
