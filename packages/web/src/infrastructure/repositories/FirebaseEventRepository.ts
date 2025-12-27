
import { injectable } from 'inversify';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { IEventRepository } from '@/domain/interfaces/repositories/IEventRepository';
import { Event } from '@/domain/entities/Event';

@injectable()
export class FirebaseEventRepository implements IEventRepository {
    private readonly collectionName = 'events';

    async getEvents(filters: { dateStart?: string; dateEnd?: string; outletId?: string }): Promise<Event[]> {
        const constraints = [];
        if (filters.outletId) constraints.push(where('outletId', '==', filters.outletId));
        if (filters.dateStart) constraints.push(where('date', '>=', filters.dateStart));
        if (filters.dateEnd) constraints.push(where('date', '<=', filters.dateEnd));

        const q = query(collection(db, this.collectionName), ...constraints);
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
    }

    async saveEvent(event: Event): Promise<void> {
        await setDoc(doc(db, this.collectionName, event.id), event);
    }

    async saveEvents(events: Event[]): Promise<void> {
        const batch = writeBatch(db);
        events.forEach(e => {
            const ref = doc(db, this.collectionName, e.id);
            batch.set(ref, e);
        });
        await batch.commit();
    }

    async deleteEvent(eventId: string): Promise<void> {
        await deleteDoc(doc(db, this.collectionName, eventId));
    }
}
