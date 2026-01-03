// import {
//     collection,
//     doc,
//     getDoc,
//     // ... other firebase imports
// } from 'firebase/firestore';
// import { db } from '@/config/firebase';
import type { IDatabaseService, QueryOptions } from '../ports/IDatabaseService';
import { supabasePersistenceService } from '@/services/supabasePersistenceService';

export class FirebaseAdapter implements IDatabaseService {
  async getDocument<T>(collectionName: string, id: string): Promise<T | null> {
    return (await supabasePersistenceService.getById<T>(collectionName, id)) || null;
  }

  async queryDocuments<T>(collectionName: string, options?: QueryOptions): Promise<T[]> {
    return await supabasePersistenceService.query<T>(collectionName, (q) => {
      let query = q;

      if (options?.filters) {
        options.filters.forEach((f) => {
          // Mapping Firebase ops to Supabase
          const val = f.value;
          if (f.operator === '==') query = query.eq(f.field, val);
          else if (f.operator === '>') query = query.gt(f.field, val);
          else if (f.operator === '>=') query = query.gte(f.field, val);
          else if (f.operator === '<') query = query.lt(f.field, val);
          else if (f.operator === '<=') query = query.lte(f.field, val);
          else if (f.operator === 'in') query = query.in(f.field, Array.isArray(val) ? val : [val]);
          // Add more mappings as needed
        });
      }

      if (options?.orderBy) {
        options.orderBy.forEach((o) => {
          query = query.order(o.field, { ascending: o.direction === 'asc' });
        });
      }

      if (options?.limit) {
        // Postgrest allows limit, but `supabasePersistenceService.query` callback gets builder which has limit but
        // typically limit is part of the chain options not exposed fully in simple callback unless we cast.
        // Assuming query builder supports .limit().
        // However, the service query method returns Data, the builder is for filters.
        // We might need to handle limit manually if builder doesn't expose it in the types we have,
        // or assume standard PostgrestFilterBuilder which has .limit().
        query = query.limit(options.limit);
      }

      if (options?.startAfter) {
        // Pagination not easily supported with cursor logic in simple map without more context.
        console.warn('startAfter not fully supported in simple Supabase adapter port.');
      }

      return query;
    });
  }

  async addDocument<T>(collectionName: string, data: T): Promise<string> {
    return await supabasePersistenceService.create(collectionName, data);
  }

  async setDocument<T>(collectionName: string, id: string, data: T): Promise<void> {
    await supabasePersistenceService.set(collectionName, id, data);
  }

  async updateDocument<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
    await supabasePersistenceService.update(collectionName, id, data);
  }

  async deleteDocument(collectionName: string, id: string): Promise<void> {
    await supabasePersistenceService.delete(collectionName, id);
  }

  async batchUpdate<T>(
    collectionName: string,
    updates: { id: string; data: Partial<T> }[]
  ): Promise<void> {
    // Sequential for now, or use Upsert if strict updates match format
    for (const u of updates) {
      await supabasePersistenceService.update(collectionName, u.id, u.data);
    }
  }
}
