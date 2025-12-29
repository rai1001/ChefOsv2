import { inject, injectable } from 'inversify';
import { TYPES } from '@/application/di/types';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import type { InviteUserDTO } from '@/types'; // Import from types now

@injectable()
export class InviteUserUseCase {
  constructor(@inject(TYPES.UserRepository) private userRepository: IUserRepository) {}

  async execute(invitation: InviteUserDTO): Promise<string> {
    return this.userRepository.createInvitation(invitation);
  }
}

// Re-export DTO if needed for backward compatibility or just rely on global type
export type { InviteUserDTO };
