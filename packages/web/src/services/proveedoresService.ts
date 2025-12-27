import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    query,
    where,
    orderBy
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Supplier } from '@/types/suppliers';
import { COLLECTIONS } from '@/config/collections';
import { sanitizeData } from '@/services/firestoreService';

const COLLECTION_NAME = COLLECTIONS.SUPPLIERS || 'suppliers';

export const proveedoresService = {
    /**
     * Get all suppliers for a specific outlet (or global if implemented)
     */
    getAll: async (outletId?: string): Promise<Supplier[]> => {
        try {
            // If outletId provided, filter. If suppliers are global, just get all.
            // Following schema: isActive check usually good.
            let q = query(collection(db, COLLECTION_NAME), orderBy('name'));

            if (outletId) {
                // If using scoped suppliers
                q = query(q, where('outletId', '==', outletId));
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            throw error;
        }
    },

    getById: async (id: string): Promise<Supplier | null> => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as Supplier;
            }
            return null;
        } catch (error) {
            console.error(`Error fetching supplier ${id}:`, error);
            throw error;
        }
    },

    create: async (supplier: Omit<Supplier, 'id'>): Promise<string> => {
        try {
            const sanitized = sanitizeData(supplier);
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...sanitized,
                createdAt: new Date().toISOString(),
                isActive: true
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating supplier:', error);
            throw error;
        }
    },

    update: async (id: string, updates: Partial<Supplier>): Promise<void> => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, sanitizeData(updates));
        } catch (error) {
            console.error(`Error updating supplier ${id}:`, error);
            throw error;
        }
    },

    delete: async (id: string): Promise<void> => {
        try {
            // Soft delete prefered? Prompt says "CRUD completo", usually Soft Delete is safer.
            // But verify requirement. "Incluir confirmaciones para borrado" implies deletion is possible.
            // We'll implementing soft delete by setting isActive: false
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, { isActive: false });
        } catch (error) {
            console.error(`Error deleting supplier ${id}:`, error);
            throw error;
        }
    },

    reactivate: async (id: string): Promise<void> => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, { isActive: true });
        } catch (error) {
            console.error(`Error reactivating supplier ${id}:`, error);
            throw error;
        }
    }
};
