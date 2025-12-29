import { inject, injectable } from 'inversify';
import { TYPES } from '@/application/di/types';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import type { Invitation } from '@/types';

@injectable()
export class ListInvitationsUseCase {
  constructor(@inject(TYPES.UserRepository) private userRepository: IUserRepository) {}

  executeStream(callback: (invitations: Invitation[]) => void): () => void {
    return this.userRepository.getPendingInvitationsStream(callback);
  }
}
