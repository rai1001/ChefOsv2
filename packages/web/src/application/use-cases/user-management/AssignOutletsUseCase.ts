import { inject, injectable } from 'inversify';
import { TYPES } from '@/application/di/types';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';

@injectable()
export class AssignOutletsUseCase {
  constructor(@inject(TYPES.UserRepository) private userRepository: IUserRepository) {}

  async execute(uid: string, outletIds: string[]): Promise<void> {
    if (!uid) throw new Error('User ID is required');
    return this.userRepository.assignOutlets(uid, outletIds);
  }
}
