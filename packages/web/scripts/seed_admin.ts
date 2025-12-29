import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'fake-api-key',
  authDomain: 'localhost',
  projectId: 'chefosv2',
  storageBucket: 'chefosv2.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:a1b2c3d4e5f6g7h8',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

connectAuthEmulator(auth, 'http://127.0.0.1:9099');
connectFirestoreEmulator(db, '127.0.0.1', 8080);

async function seedAdmin() {
  const email = 'admin@chefos.com';
  const password = 'password123';

  try {
    console.log(`Creating user ${email}...`);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('User created in Auth:', user.uid);

    console.log('Creating user document in Firestore...');
    await setDoc(doc(db, 'users', user.uid), {
      email: email,
      role: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
    });
    console.log('User document created successfully.');
    process.exit(0);
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('User already exists. Skipping creation.');
      // We might want to ensure the firestore doc exists though
      process.exit(0);
    }
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
