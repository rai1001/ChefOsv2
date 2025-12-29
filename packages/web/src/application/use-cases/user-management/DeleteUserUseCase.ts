import { inject, injectable } from 'inversify';
import { TYPES } from '@/application/di/types';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import { UserRole } from '@/domain/entities/User';

@injectable()
export class DeleteUserUseCase {
  constructor(@inject(TYPES.UserRepository) private userRepository: IUserRepository) {}

  async execute(uid: string, currentRequestingUserUid: string): Promise<void> {
    if (!uid) throw new Error('User ID is required');

    if (uid === currentRequestingUserUid) {
      throw new Error('You cannot delete your own account.');
    }

    // Prevent deleting the last admin
    const admins = await this.userRepository.getUsersByRole(UserRole.ADMIN);
    if (admins.length <= 1 && admins.some((a) => a.id === uid)) {
      throw new Error('No se puede eliminar el último administrador del sistema');
    }

    return this.userRepository.deleteUser(uid);
  }
}
