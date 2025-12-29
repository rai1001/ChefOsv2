import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import { UserRole } from '@/domain/entities/User';

export class ChangeUserRoleUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(uid: string, role: UserRole): Promise<void> {
    if (!uid) throw new Error('User ID is required');
    return this.userRepository.changeUserRole(uid, role);
  }
}
