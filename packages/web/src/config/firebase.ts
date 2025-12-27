import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';
import { getPerformance, FirebasePerformance } from 'firebase/performance';
import { getDatabase, connectDatabaseEmulator, Database } from 'firebase/database';
import { getMessaging, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBovdKOOGTuN0vIRHUTmQ5JFqKwQUoBfkc',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'chefosv2.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'chefosv2',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'chefosv2.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '462911840752',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:462911840752:web:13284f498bbf5045507d35',
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    'https://chefosv2-default-rtdb.europe-west1.firebasedatabase.app',
};

// Detectar si estamos en modo emulator
const USE_EMULATOR = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';

// Inicializar Firebase
export const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions = getFunctions(app);
export const perf: FirebasePerformance | null =
  typeof window !== 'undefined' && !USE_EMULATOR ? getPerformance(app) : null;
export const rtdb: Database = getDatabase(app);
// Initialize Messaging safely (may fail in test/SSR environments)
let _messaging: Messaging | null = null;
try {
  // Only attempt if window is defined (basic check) although getMessaging does its own checks
  if (typeof window !== 'undefined') {
    _messaging = getMessaging(app);
  }
} catch (e) {
  console.warn('Firebase Messaging not supported in this environment');
}
export const messaging = _messaging;

// Conectar a emuladores en desarrollo
if (USE_EMULATOR) {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    connectDatabaseEmulator(rtdb, '127.0.0.1', 9000);
    console.log('Connected to Firebase Emulators');
  } catch (error) {
    console.warn('Failed to connect to Firebase Emulators:', error);
  }
}
