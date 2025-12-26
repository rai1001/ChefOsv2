import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBovdKOOGTuN0vIRHUTmQ5JFqKwQUoBfkc',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'chefosv2.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'chefosv2',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'chefosv2.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '462911840752',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:462911840752:web:13284f498bbf5045507d35',
};

// Detectar si estamos en modo emulator
const USE_EMULATOR = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';

// Inicializar Firebase
export const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions = getFunctions(app);

// Conectar a emuladores en desarrollo
if (USE_EMULATOR) {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    console.log('Connected to Firebase Emulators');
  } catch (error) {
    console.warn('Failed to connect to Firebase Emulators:', error);
  }
}
