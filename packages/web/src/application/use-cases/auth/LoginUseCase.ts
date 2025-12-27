import { injectable, inject } from 'inversify';
import { IAuthRepository } from '@/domain/interfaces/repositories/IAuthRepository';
import { TYPES } from '../../di/types';
import { User } from '@/domain/entities/User';

@injectable()
export class LoginUseCase {
    constructor(
        @inject(TYPES.AuthRepository) private authRepository: IAuthRepository
    ) { }

    async execute(): Promise<User> {
        return this.authRepository.signInWithGoogle();
    }
}
