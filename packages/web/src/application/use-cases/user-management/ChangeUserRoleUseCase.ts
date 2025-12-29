import { inject, injectable } from 'inversify';
import { TYPES } from '@/application/di/types';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import { UserRole } from '@/domain/entities/User';

@injectable()
export class ChangeUserRoleUseCase {
  constructor(@inject(TYPES.UserRepository) private userRepository: IUserRepository) {}

  async execute(uid: string, role: UserRole): Promise<void> {
    if (!uid) throw new Error('User ID is required');
    return this.userRepository.changeUserRole(uid, role);
  }
}
