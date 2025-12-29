import { inject, injectable } from 'inversify';
import { TYPES } from '@/application/di/types';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';

@injectable()
export class DeleteInvitationUseCase {
  constructor(@inject(TYPES.UserRepository) private userRepository: IUserRepository) {}

  async execute(invitationId: string): Promise<void> {
    await this.userRepository.deleteInvitation(invitationId);
  }
}
