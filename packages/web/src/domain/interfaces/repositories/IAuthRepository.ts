import { User } from '../../entities/User';

export interface IAuthRepository {
    currentUser: User | null;
    signInWithGoogle(): Promise<User>;
    signOut(): Promise<void>;
    onAuthStateChanged(callback: (user: User | null) => void): () => void;
}
