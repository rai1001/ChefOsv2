import {
  collection,
  query,
  onSnapshot,
  where,
  getDocs,
  addDoc,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  getCollection,
  getDocumentById,
  setDocument,
  deleteDocument,
  updateDocument as firestoreUpdate,
} from '@/services/firestoreService';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import type { User, UserUpdateDTO, Invitation, InviteUserDTO } from '@/types';
import { UserRole } from '@/domain/entities/User';
import { injectable } from 'inversify';

@injectable()
export class FirestoreUserRepository implements IUserRepository {
  private collectionName = 'users';

  async getAllUsers(): Promise<User[]> {
    return await getCollection<User>(this.collectionName);
  }

  // Real-time listener implementation
  getAllUsersStream(callback: (users: User[]) => void): () => void {
    const q = query(collection(db, this.collectionName));
    return onSnapshot(
      q,
      (snapshot) => {
        const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as User);
        callback(users);
      },
      (error) => {
        console.error('Error streaming users:', error);
      }
    );
  }

  async getUserById(uid: string): Promise<User | null> {
    const user = await getDocumentById<User>(this.collectionName, uid);
    return user || null;
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    const q = query(collection(db, this.collectionName), where('role', '==', role));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as User);
  }

  async getActiveUsers(): Promise<User[]> {
    const q = query(collection(db, this.collectionName), where('active', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as User);
  }

  async updateUser(uid: string, updates: Partial<UserUpdateDTO>): Promise<void> {
    await firestoreUpdate(this.collectionName, uid, {
      ...updates,
      updatedAt: new Date().toISOString(),
    } as any);
  }

  async activateUser(uid: string): Promise<void> {
    return this.updateUser(uid, { active: true });
  }

  async deactivateUser(uid: string): Promise<void> {
    return this.updateUser(uid, { active: false });
  }

  async deleteUser(uid: string): Promise<void> {
    await deleteDocument(this.collectionName, uid);
  }

  async assignOutlets(uid: string, outletIds: string[]): Promise<void> {
    return this.updateUser(uid, { allowedOutlets: outletIds });
  }

  async setDefaultOutlet(uid: string, outletId: string): Promise<void> {
    return this.updateUser(uid, { defaultOutletId: outletId });
  }

  async changeUserRole(uid: string, role: UserRole): Promise<void> {
    return this.updateUser(uid, { role: role as any }); // Cast if needed depending on Role type vs UserRole enum match
  }

  // Invitations
  async createInvitation(invitation: InviteUserDTO): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'invitations'), {
        ...invitation,
        status: 'pending',
        createdAt: new Date().toISOString(), // Use ISO string matching our Type. Trigger sends serverTimestamp() but local optimistic can be Date or just let firestore handle
        // Wait, cloud function uses onCreate.
        // Let's use Date.now() or ISO.
        // Best to use serverTimestamp for order but our Type says string.
        // Let's settle on string for frontend type, but we can write serverTimestamp if we cast.
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }
  }

  getPendingInvitationsStream(callback: (invitations: Invitation[]) => void): () => void {
    const q = query(collection(db, 'invitations'), where('status', '==', 'pending'));
    return onSnapshot(
      q,
      (snapshot) => {
        const invitations = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Invitation
        );
        callback(invitations);
      },
      (error) => {
        console.error('Error streaming invitations:', error);
      }
    );
  }

  async deleteInvitation(invitationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'invitations', invitationId));
    } catch (error) {
      console.error('Error deleting invitation:', error);
      throw error;
    }
  }
}
