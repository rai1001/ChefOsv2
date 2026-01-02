import { injectable } from 'inversify';
import {
  getCollection,
  setDocument,
  deleteDocument,
  batchSetDocuments,
} from '@/services/firestoreService';
import { IEventRepository } from '@/domain/interfaces/repositories/IEventRepository';
import { Event } from '@/domain/entities/Event';

@injectable()
export class FirebaseEventRepository implements IEventRepository {
  private readonly collectionName = 'events';

  async getEvents(filters: {
    dateStart?: string;
    dateEnd?: string;
    outletId?: string;
  }): Promise<Event[]> {
    // We use the delegated getCollection which honors Supabase if active
    const events = await getCollection<Event>(this.collectionName);

    return events.filter((e) => {
      if (filters.outletId && e.outletId !== filters.outletId) return false;
      if (filters.dateStart && e.date < filters.dateStart) return false;
      if (filters.dateEnd && e.date > filters.dateEnd) return false;
      return true;
    });
  }

  async saveEvent(event: Event): Promise<void> {
    await setDocument(this.collectionName, event.id, event as any);
  }

  async saveEvents(events: Event[]): Promise<void> {
    const docs = events.map((e) => ({ id: e.id, data: e }));
    await batchSetDocuments(this.collectionName, docs);
  }

  async deleteEvent(eventId: string): Promise<void> {
    await deleteDocument(this.collectionName, eventId);
  }
}
