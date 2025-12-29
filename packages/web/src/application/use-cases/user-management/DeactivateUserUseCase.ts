import type { IUserRepository } from '@/domain/repositories/IUserRepository';

export class DeactivateUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(uid: string, currentRequestingUserUid: string): Promise<void> {
    if (!uid) throw new Error('User ID is required');

    if (uid === currentRequestingUserUid) {
      throw new Error('You cannot deactivate your own account.');
    }

    // Additional validation: Check if target is the last admin could be here or in repository
    // For simplicity, we just block self-deactivation.

    return this.userRepository.deactivateUser(uid);
  }
}
