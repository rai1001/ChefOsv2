import type { IUserRepository } from '@/domain/repositories/IUserRepository';

export class AssignOutletsUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(uid: string, outletIds: string[]): Promise<void> {
    if (!uid) throw new Error('User ID is required');
    return this.userRepository.assignOutlets(uid, outletIds);
  }
}
