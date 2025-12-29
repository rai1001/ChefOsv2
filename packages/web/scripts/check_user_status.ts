import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'fake-api-key',
  authDomain: 'localhost',
  projectId: 'chefosv2',
  storageBucket: 'chefosv2.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:a1b2c3d4e5f6g7h8',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

connectFirestoreEmulator(db, '127.0.0.1', 8080);

async function checkUserStatus() {
  try {
    const q = query(collection(db, 'users'), where('email', '==', 'invitee@test.com'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('No user found for invitee@test.com');
      // Check invitation status
      const authQ = query(collection(db, 'invitations'), where('email', '==', 'invitee@test.com'));
      const authSnap = await getDocs(authQ);
      authSnap.forEach((d) => console.log(`Invitation Status: ${d.data().status}`));
      process.exit(0);
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`User Found: ${data.email}`);
      console.log(`Role: ${data.role}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error checking user:', error);
    process.exit(1);
  }
}

checkUserStatus();
