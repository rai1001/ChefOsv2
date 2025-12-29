import type { IUserRepository } from '@/domain/repositories/IUserRepository';

export class DeleteUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(uid: string, currentRequestingUserUid: string): Promise<void> {
    if (!uid) throw new Error('User ID is required');

    if (uid === currentRequestingUserUid) {
      throw new Error('You cannot delete your own account.');
    }

    // Logic to prevent deleting the last admin should be checked here
    // const admins = await this.userRepository.getUsersByRole(UserRole.ADMIN);
    // if (admins.length <= 1 && admins[0].id === uid) throw new Error('Cannot delete the last admin');

    return this.userRepository.deleteUser(uid);
  }
}
