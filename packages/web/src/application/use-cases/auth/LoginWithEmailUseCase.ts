
import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { IAuthRepository } from '@/domain/interfaces/repositories/IAuthRepository';
import { User } from '@/domain/entities/User';

@injectable()
export class LoginWithEmailUseCase {
    constructor(
        @inject(TYPES.AuthRepository) private authRepository: IAuthRepository
    ) { }

    async execute(params: { email: string; password: string }): Promise<User> {
        return await this.authRepository.signInWithEmail(params.email, params.password);
    }
}
