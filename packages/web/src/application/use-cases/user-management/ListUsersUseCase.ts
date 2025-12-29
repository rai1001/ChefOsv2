import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import type { User } from '@/types';

export class ListUsersUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(): Promise<User[]> {
    return this.userRepository.getAllUsers();
  }

  // Optional: Real-time
  executeStream(callback: (users: User[]) => void): () => void {
    return this.userRepository.getAllUsersStream(callback);
  }
}
