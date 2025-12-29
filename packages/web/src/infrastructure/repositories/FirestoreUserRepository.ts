import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import type { User, UserUpdateDTO } from '@/types'; // Import from types/index.ts where we added DTOs
import { UserRole } from '@/domain/entities/User';

export class FirestoreUserRepository implements IUserRepository {
  private collectionName = 'users';

  async getAllUsers(): Promise<User[]> {
    try {
      const q = query(collection(db, this.collectionName));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as User);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
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
    try {
      const docRef = doc(db, this.collectionName, uid);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    try {
      const q = query(collection(db, this.collectionName), where('role', '==', role));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as User);
    } catch (error) {
      console.error('Error fetching users by role:', error);
      throw error;
    }
  }

  async getActiveUsers(): Promise<User[]> {
    try {
      const q = query(collection(db, this.collectionName), where('active', '==', true));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as User);
    } catch (error) {
      console.error('Error fetching active users:', error);
      throw error;
    }
  }

  async updateUser(uid: string, updates: Partial<UserUpdateDTO>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, uid);
      await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async activateUser(uid: string): Promise<void> {
    return this.updateUser(uid, { active: true });
  }

  async deactivateUser(uid: string): Promise<void> {
    // Validation: Check if user is trying to deactivate themselves is handled at UseCase level mostly,
    // but good to have safety here or just rely on UI/UseCase.
    return this.updateUser(uid, { active: false });
  }

  async deleteUser(uid: string): Promise<void> {
    try {
      // Safety: Prevent deleting the last admin should be checked before calling this
      // or check here.
      const docRef = doc(db, this.collectionName, uid);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
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
}
