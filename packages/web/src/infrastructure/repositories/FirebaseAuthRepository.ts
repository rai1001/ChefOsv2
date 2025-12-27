import { injectable } from 'inversify';
import { IAuthRepository } from '@/domain/interfaces/repositories/IAuthRepository';
import { User, UserRole } from '@/domain/entities/User';
import { auth } from '@/config/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword } from 'firebase/auth';

@injectable()
export class FirebaseAuthRepository implements IAuthRepository {
    private _currentUser: User | null = null;

    get currentUser(): User | null {
        return this._currentUser;
    }

    constructor() {
        this.initialize();
    }

    private initialize() {
        onAuthStateChanged(auth, (firebaseUser) => {
            this._currentUser = firebaseUser ? this.mapFirebaseUserToEntity(firebaseUser) : null;
        });
    }

    async signInWithGoogle(): Promise<User> {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = this.mapFirebaseUserToEntity(result.user);
        this._currentUser = user;
        return user;
    }

    async signInWithEmail(email: string, password: string): Promise<User> {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const user = this.mapFirebaseUserToEntity(result.user);
        this._currentUser = user;
        return user;
    }

    async signOut(): Promise<void> {
        await signOut(auth);
        this._currentUser = null;
    }

    onAuthStateChanged(callback: (user: User | null) => void): () => void {
        return onAuthStateChanged(auth, (firebaseUser) => {
            const user = firebaseUser ? this.mapFirebaseUserToEntity(firebaseUser) : null;
            this._currentUser = user;
            callback(user);
        });
    }

    private mapFirebaseUserToEntity(firebaseUser: FirebaseUser): User {
        return new User({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || undefined,
            role: UserRole.CHEF, // Default role, logic to be expanded
            createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
            updatedAt: new Date(firebaseUser.metadata.lastSignInTime || Date.now()),
        });
    }
}
