import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import type { UserUpdateDTO } from '@/types';

export class UpdateUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(uid: string, updates: Partial<UserUpdateDTO>): Promise<void> {
    if (!uid) throw new Error('User ID is required');
    return this.userRepository.updateUser(uid, updates);
  }
}
