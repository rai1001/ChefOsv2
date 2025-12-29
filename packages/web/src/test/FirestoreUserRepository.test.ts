import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FirestoreUserRepository } from '../infrastructure/repositories/FirestoreUserRepository';
import { UserRole } from '../domain/entities/User';

// Mocks
// Mocks
const mocks = vi.hoisted(() => ({
  db: { type: 'db' },
  collection: vi.fn(() => ({ type: 'collection' })),
  doc: vi.fn(() => ({ type: 'doc' })),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(() => ({ type: 'query' })),
  where: vi.fn(() => ({ type: 'where' })),
  onSnapshot: vi.fn(),
}));

vi.mock('@/config/firebase', () => ({
  db: mocks.db,
}));

// Removed separate mock declarations, using mocks object instead

vi.mock('firebase/firestore', () => ({
  collection: mocks.collection,
  doc: mocks.doc,
  getDocs: mocks.getDocs,
  getDoc: mocks.getDoc,
  updateDoc: mocks.updateDoc,
  deleteDoc: mocks.deleteDoc,
  addDoc: mocks.addDoc,
  query: mocks.query,
  where: mocks.where,
  onSnapshot: mocks.onSnapshot,
}));

describe('FirestoreUserRepository', () => {
  let repository: FirestoreUserRepository;

  beforeEach(() => {
    repository = new FirestoreUserRepository();
    vi.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const mockUsers = [
        { id: '1', email: 'test@test.com', role: UserRole.ADMIN },
        { id: '2', email: 'user@test.com', role: UserRole.STAFF },
      ];

      mocks.getDocs.mockResolvedValue({
        docs: mockUsers.map((user) => ({
          id: user.id,
          data: () => user,
        })),
      });

      const users = await repository.getAllUsers();
      expect(users).toHaveLength(2);
      expect(users[0].id).toBe('1');
      expect(mocks.collection).toHaveBeenCalledWith(mocks.db, 'users');
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '1', email: 'test@test.com', role: UserRole.ADMIN };

      mocks.getDoc.mockResolvedValue({
        exists: () => true,
        id: '1',
        data: () => mockUser,
      });

      const user = await repository.getUserById('1');
      expect(user).toBeDefined();
      expect(user?.id).toBe('1');
      expect(mocks.doc).toHaveBeenCalledWith(mocks.db, 'users', '1');
    });

    it('should return null when not found', async () => {
      mocks.getDoc.mockResolvedValue({
        exists: () => false,
      });

      const user = await repository.getUserById('999');
      expect(user).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      await repository.updateUser('1', { active: false });

      expect(mocks.doc).toHaveBeenCalledWith(mocks.db, 'users', '1');
      expect(mocks.updateDoc).toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      await repository.deleteUser('1');

      expect(mocks.doc).toHaveBeenCalledWith(mocks.db, 'users', '1');
      expect(mocks.deleteDoc).toHaveBeenCalled();
    });
  });

  describe('createInvitation', () => {
    it('should create invitation and return id', async () => {
      const mockInvitation = {
        email: 'new@test.com',
        role: UserRole.STAFF,
        allowedOutlets: [],
      };

      mocks.addDoc.mockResolvedValue({ id: 'invitation-1' });

      const id = await repository.createInvitation(mockInvitation);

      expect(id).toBe('invitation-1');
      expect(mocks.collection).toHaveBeenCalledWith(mocks.db, 'invitations');
      expect(mocks.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          email: 'new@test.com',
          status: 'pending',
        })
      );
    });
  });
});
