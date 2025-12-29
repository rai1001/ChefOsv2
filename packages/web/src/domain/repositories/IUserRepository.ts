import type { User, UserUpdateDTO } from '@/types';
import type { UserRole } from '@/domain/entities/User';

export interface IUserRepository {
  // Read
  getAllUsers(): Promise<User[]>;
  getAllUsersStream(callback: (users: User[]) => void): () => void; // Added for realtime requirements
  getUserById(uid: string): Promise<User | null>;
  getUsersByRole(role: UserRole): Promise<User[]>;
  getActiveUsers(): Promise<User[]>;

  // Write
  updateUser(uid: string, updates: Partial<UserUpdateDTO>): Promise<void>;
  activateUser(uid: string): Promise<void>;
  deactivateUser(uid: string): Promise<void>;
  deleteUser(uid: string): Promise<void>;
  assignOutlets(uid: string, outletIds: string[]): Promise<void>;
  setDefaultOutlet(uid: string, outletId: string): Promise<void>;
  changeUserRole(uid: string, role: UserRole): Promise<void>;
}
