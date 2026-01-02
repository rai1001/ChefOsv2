import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

// We'll test both keys
const KEYS = {
  REPO: 'AIzaSyBovdKOOGTuN0vIRHUTmQ5JFqKwQUoBfkc',
  SCREENSHOT: 'AIzaSyDeX80506Xv8wKssS-HIM6PJrXoAbuwqMc',
};

const firebaseConfig_base = {
  authDomain: 'chefosv2.firebaseapp.com',
  projectId: 'chefosv2',
  storageBucket: 'chefosv2.firebasestorage.app',
  messagingSenderId: '462911840752',
  appId: '1:462911840752:web:13284f498bbf5045507d35',
};

async function testKey(name: string, apiKey: string, email: string) {
  console.log(`\n--- Testing Key: ${name} (${apiKey.substring(0, 10)}...) ---`);
  const app = initializeApp({ ...firebaseConfig_base, apiKey }, name);
  const auth = getAuth(app);

  try {
    // Try with a dummy password to see the error type
    await signInWithEmailAndPassword(auth, email, 'WRONG_PASSWORD_TEST');
  } catch (error: any) {
    console.log(`Login Result for ${name}: ${error.code}`);
    if (error.code === 'auth/invalid-credential') {
      console.log(
        '  -> This key/config produced the same error as the screenshot (could be wrong password OR configuration issue).'
      );
    } else if (error.code === 'auth/user-not-found') {
      console.log('  -> User does not exist.');
    } else if (error.code === 'auth/wrong-password') {
      console.log('  -> User exists, password wrong (Key is likely correct).');
    } else {
      console.log(`  -> Other error: ${error.message}`);
    }
  }

  try {
    // Try to create the user to see if it already exists
    await createUserWithEmailAndPassword(auth, email, 'TemporaryPassword123!');
    console.log(
      `Registration Result for ${name}: SUCCESS (User did not exist, but now they do! You might want to delete them).`
    );
  } catch (error: any) {
    console.log(`Registration Result for ${name}: ${error.code}`);
    if (error.code === 'auth/email-already-in-use') {
      console.log('  -> User DEFINITELY exists in this project.');
    }
  }
}

async function main() {
  const email = process.argv[2] || 'raisuda1001@gmail.com';
  console.log(`Verifying user: ${email}`);

  await testKey('REPO', KEYS.REPO, email);
  await testKey('SCREENSHOT', KEYS.SCREENSHOT, email);
}

main().catch(console.error);
