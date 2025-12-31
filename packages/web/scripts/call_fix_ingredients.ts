import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyBNayVOf4y3YY-v8h_qkZFoJbXJZL48xaE',
  authDomain: 'chefosv2.firebaseapp.com',
  projectId: 'chefosv2',
  storageBucket: 'chefosv2.firebasestorage.app',
  messagingSenderId: '1070594452814',
  appId: '1:1070594452814:web:a3a2f396fe91d16ddb9f89',
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, 'europe-southwest1');

async function callFixIngredients() {
  console.log('🔧 Calling fixIngredientsData function...');

  const fixIngredients = httpsCallable(functions, 'fixIngredientsData');

  try {
    const result = await fixIngredients();
    console.log('✅ Success!', result.data);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

callFixIngredients()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
