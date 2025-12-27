import { atom } from 'jotai';
import { User } from '@/domain/entities/User';
import { container } from '@/application/di/Container';
import { TYPES } from '@/application/di/types';
import { LoginUseCase } from '@/application/use-cases/auth/LoginUseCase';
import { LoginWithEmailUseCase } from '@/application/use-cases/auth/LoginWithEmailUseCase';

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
            import('./useStore').then(({ useStore }) => {
                useStore.getState().setCurrentUser(user as any);
            });
        } catch (error) {
            console.error('Login failed:', error);
            set(errorAtom, 'Failed to login with Google');
        } finally {
            set(isLoadingAtom, false);
        }
    }
);

export const loginWithEmailAtom = atom(
    null,
    async (_get, set, params: { email: string; password: string }) => {
        set(isLoadingAtom, true);
        set(errorAtom, null);
        try {
            const loginUseCase = container.get<LoginWithEmailUseCase>(TYPES.LoginWithEmailUseCase);
            const user = await loginUseCase.execute(params);
            set(userAtom, user);
            import('./useStore').then(({ useStore }) => {
                useStore.getState().setCurrentUser(user as any); // Type assertion needed due to potential mismatch
            });
        } catch (error) {
            console.error('Email login failed:', error);
            set(errorAtom, 'Credenciales incorrectas');
        } finally {
            set(isLoadingAtom, false);
        }
    }
);
