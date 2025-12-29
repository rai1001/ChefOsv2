import { inject, injectable } from 'inversify';
import { TYPES } from '@/application/di/types';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import type { User } from '@/types';

@injectable()
export class ListUsersUseCase {
  constructor(@inject(TYPES.UserRepository) private userRepository: IUserRepository) {}

  async execute(): Promise<User[]> {
    return this.userRepository.getAllUsers();
  }

  // Optional: Real-time
  executeStream(callback: (users: User[]) => void): () => void {
    return this.userRepository.getAllUsersStream(callback);
  }
}
