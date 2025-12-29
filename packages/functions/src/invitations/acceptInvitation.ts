import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

interface AcceptInvitationData {
  invitationId: string;
}

export const acceptInvitation = onCall(async (request) => {
  // 1. Verify Authentication (optional: mostly for verified email, but here we might be strictly anonymous/new user)
  // Actually, usually the user clicks the link, goes to a page where they signIn (or signUp).
  // If they are signing up, they are Authenticated at this point.

  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The user must be authenticated to accept an invitation.'
    );
  }

  const { invitationId } = request.data as AcceptInvitationData;
  const uid = request.auth.uid;
  const email = request.auth.token.email;

  if (!invitationId) {
    throw new HttpsError('invalid-argument', 'Invitation ID is required.');
  }

  const db = admin.firestore();
  const invitationRef = db.collection('invitations').doc(invitationId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const invitationDoc = await transaction.get(invitationRef);

      if (!invitationDoc.exists) {
        throw new HttpsError('not-found', 'Invitation not found.');
      }

      const invitation = invitationDoc.data();

      if (invitation?.status !== 'sent' && invitation?.status !== 'pending') {
        throw new HttpsError(
          'failed-precondition',
          'Invitation is no longer valid or has already been used.'
        );
      }

      // Verify email matches (security check)
      if (email && invitation.email && email.toLowerCase() !== invitation.email.toLowerCase()) {
        throw new HttpsError(
          'permission-denied',
          'The email of the account does not match the invitation.'
        );
      }

      // Create/Update User Profile
      const userRef = db.collection('users').doc(uid);

      // We set the role and outlets from the invitation
      // We also ensure active is true
      transaction.set(
        userRef,
        {
          uid: uid,
          email: email,
          role: invitation.role,
          allowedOutlets: invitation.allowedOutlets || [],
          active: true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Mark invitation as accepted
      transaction.update(invitationRef, {
        status: 'accepted',
        acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
        acceptedBy: uid,
      });

      return { success: true, role: invitation.role };
    });

    return result;
  } catch (error) {
    console.error('Error accepting invitation:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'An internal error occurred while accepting the invitation.');
  }
});
