import type { Supplier } from '@/types/suppliers';
import { COLLECTIONS } from '@/config/collections';
import { supabasePersistenceService } from '@/services/supabasePersistenceService';

const COLLECTION_NAME = COLLECTIONS.SUPPLIERS || 'suppliers';

export const proveedoresService = {
  /**
   * Get all suppliers for a specific outlet (or global if implemented)
   */
  getAll: async (outletId?: string): Promise<Supplier[]> => {
    try {
      if (outletId) {
        return await supabasePersistenceService.query<Supplier>(COLLECTION_NAME, (query) =>
          query.eq('outletId', outletId).order('name', { ascending: true })
        );
      }
      return await supabasePersistenceService.getAll<Supplier>(COLLECTION_NAME);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw error;
    }
  },

  getById: async (id: string): Promise<Supplier | null> => {
    try {
      const temp = await supabasePersistenceService.getById<Supplier>(COLLECTION_NAME, id);
      return temp || null;
    } catch (error) {
      console.error(`Error fetching supplier ${id}:`, error);
      throw error;
    }
  },

  create: async (supplier: Omit<Supplier, 'id'>): Promise<string> => {
    try {
      const newItem = {
        ...supplier,
        createdAt: new Date().toISOString(),
        isActive: true,
      };
      // Assuming persistence service create returns ID
      const id = await supabasePersistenceService.create(COLLECTION_NAME, newItem);
      return id;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  },

  update: async (id: string, updates: Partial<Supplier>): Promise<void> => {
    try {
      await supabasePersistenceService.update(COLLECTION_NAME, id, updates);
    } catch (error) {
      console.error(`Error updating supplier ${id}:`, error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      // Soft delete
      await supabasePersistenceService.update(COLLECTION_NAME, id, { isActive: false });
    } catch (error) {
      console.error(`Error deleting supplier ${id}:`, error);
      throw error;
    }
  },

  reactivate: async (id: string): Promise<void> => {
    try {
      await supabasePersistenceService.update(COLLECTION_NAME, id, { isActive: true });
    } catch (error) {
      console.error(`Error reactivating supplier ${id}:`, error);
      throw error;
    }
  },
};
