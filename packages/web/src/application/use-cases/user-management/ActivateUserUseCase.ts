import type { IUserRepository } from '@/domain/repositories/IUserRepository';

export class ActivateUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(uid: string): Promise<void> {
    if (!uid) throw new Error('User ID is required');
    return this.userRepository.activateUser(uid);
  }
}
