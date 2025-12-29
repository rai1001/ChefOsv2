import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Mock credential not needed for emulator usually, but good for structure
const projectId = 'chefosv2';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

const app = initializeApp({
  projectId,
});

const db = getFirestore(app);

async function getInvitationToken() {
  try {
    console.log('Querying for invitee@test.com...');
    const invitationsRef = db.collection('invitations');
    const q = invitationsRef.where('email', '==', 'invitee@test.com');
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
      console.log('No invitation found for invitee@test.com');
      process.exit(1);
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Token: ${data.token}`);
      console.log(`ID: ${doc.id}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error getting invitation:', error);
    process.exit(1);
  }
}

getInvitationToken();
