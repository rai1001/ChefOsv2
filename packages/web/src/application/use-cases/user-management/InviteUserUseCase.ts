import { db } from '@/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Role } from '@/types';

export interface InviteUserDTO {
  email: string;
  role: Role;
  allowedOutlets: string[];
}

export class InviteUserUseCase {
  async execute(invitation: InviteUserDTO): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'invitations'), {
        ...invitation,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }
  }
}
