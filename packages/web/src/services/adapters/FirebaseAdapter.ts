import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    writeBatch,
} from 'firebase/firestore';
import type {
    DocumentData,
    QueryConstraint
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { IDatabaseService, QueryOptions } from '../ports/IDatabaseService';

export class FirebaseAdapter implements IDatabaseService {
    async getDocument<T>(collectionName: string, id: string): Promise<T | null> {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? (docSnap.data() as T) : null;
    }

    async queryDocuments<T>(collectionName: string, options?: QueryOptions): Promise<T[]> {
        const constraints: QueryConstraint[] = [];

        if (options?.filters) {
            options.filters.forEach((f) => {
                constraints.push(where(f.field, f.operator, f.value));
            });
        }

        if (options?.orderBy) {
            options.orderBy.forEach((o) => {
                constraints.push(orderBy(o.field, o.direction));
            });
        }

        if (options?.limit) {
            constraints.push(limit(options.limit));
        }

        if (options?.startAfter) {
            constraints.push(startAfter(options.startAfter));
        }

        const q = query(collection(db, collectionName), ...constraints);
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
    }

    async addDocument<T>(collectionName: string, data: T): Promise<string> {
        const docRef = await addDoc(collection(db, collectionName), data as DocumentData);
        return docRef.id;
    }

    async setDocument<T>(collectionName: string, id: string, data: T): Promise<void> {
        const docRef = doc(db, collectionName, id);
        await setDoc(docRef, data as DocumentData);
    }

    async updateDocument<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, data as DocumentData);
    }

    async deleteDocument(collectionName: string, id: string): Promise<void> {
        const docRef = doc(db, collectionName, id);
        await deleteDoc(docRef);
    }

    async batchUpdate<T>(collectionName: string, updates: { id: string; data: Partial<T> }[]): Promise<void> {
        const batch = writeBatch(db);
        updates.forEach(u => {
            const docRef = doc(db, collectionName, u.id);
            batch.update(docRef, u.data as DocumentData);
        });
        await batch.commit();
    }
}
