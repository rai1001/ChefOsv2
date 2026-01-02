import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBovdKOOGTuN0vIRHUTmQ5JFqKwQUoBfkc',
  authDomain: 'chefosv2.firebaseapp.com',
  projectId: 'chefosv2',
  storageBucket: 'chefosv2.firebasestorage.app',
  messagingSenderId: '462911840752',
  appId: '1:462911840752:web:13284f498bbf5045507d35',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createProdUser() {
  const email = 'pagopaypal1978@gmail.com';
  const password = 'ChefOs2025!'; // Default password

  console.log(`Creating user ${email} in PRODUCTION...`);

  try {
    // 1. Create User in Auth
    let user;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;
      console.log('✅ User created in Auth. UID:', user.uid);
    } catch (authError: any) {
      if (authError.code === 'auth/email-already-in-use') {
        console.log('User already exists in Auth. Trying to sign in to get UID...');
        try {
          const signInCred = await signInWithEmailAndPassword(auth, email, password);
          user = signInCred.user;
          console.log('✅ Signed in successfully. UID:', user.uid);
        } catch (signinError) {
          console.error('❌ Could not sign in. Maybe wrong password?', signinError);
          process.exit(1);
        }
      } else {
        throw authError;
      }
    }

    if (!user) {
      console.error('❌ No user object found.');
      process.exit(1);
    }

    // 2. Create/Update Document in Firestore
    console.log('Creating/Updating user document in Firestore...');
    await setDoc(
      doc(db, 'users', user.uid),
      {
        email: email.toLowerCase(),
        role: 'admin', // GRANT ADMIN ROLE
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        displayName: 'Admin User',
      },
      { merge: true }
    ); // Merge to avoid overwriting other fields if they exist

    console.log('✅ User document updated successfully with ADMIN role.');
    console.log('------------------------------------------------');
    console.log(`Credentials: ${email} / ${password}`);
    console.log('------------------------------------------------');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating user:', error);
    process.exit(1);
  }
}

createProdUser();
