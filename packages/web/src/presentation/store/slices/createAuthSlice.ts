import type { StateCreator } from 'zustand';
import type { AppState, AuthSlice, User } from '@/presentation/store/types';

export const createAuthSlice: StateCreator<
    AppState,
    [],
    [],
    AuthSlice
> = (set) => ({
    currentUser: null,
    // In prod, this would default to null.

    setCurrentUser: (user: User | null) => set({ currentUser: user }),
});
