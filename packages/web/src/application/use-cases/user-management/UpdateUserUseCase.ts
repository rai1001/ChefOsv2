import { inject, injectable } from 'inversify';
import { TYPES } from '@/application/di/types';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import type { UserUpdateDTO } from '@/types';

@injectable()
export class UpdateUserUseCase {
  constructor(@inject(TYPES.UserRepository) private userRepository: IUserRepository) {}

  async execute(uid: string, updates: Partial<UserUpdateDTO>): Promise<void> {
    if (!uid) throw new Error('User ID is required');
    return this.userRepository.updateUser(uid, updates);
  }
}
