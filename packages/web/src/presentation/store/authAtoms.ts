import { atom } from 'jotai';
import { User } from '../../domain/entities/User';
import { container } from '../../application/di/Container';
import { TYPES } from '../../application/di/types';
import { LoginUseCase } from '../../application/use-cases/auth/LoginUseCase';

// Base atoms
export const userAtom = atom<User | null>(null);
export const isLoadingAtom = atom<boolean>(false);
export const errorAtom = atom<string | null>(null);

// Derived atoms
export const isAuthenticatedAtom = atom((get) => !!get(userAtom));

// Action atoms
export const loginWithGoogleAtom = atom(
    null,
    async (_get, set) => {
        set(isLoadingAtom, true);
        set(errorAtom, null);
        try {
            const loginUseCase = container.get<LoginUseCase>(TYPES.LoginUseCase);
            const user = await loginUseCase.execute();
            set(userAtom, user);
        } catch (error) {
            console.error('Login failed:', error);
            set(errorAtom, 'Failed to login with Google');
        } finally {
            set(isLoadingAtom, false);
        }
    }
);
