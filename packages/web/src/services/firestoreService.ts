// Basic types mock to satisfy existing consumers if needed, though most should be updated to use Supabase types eventually
type CollectionReference<T = DocumentData> = { path: string };
type DocumentData = { [key: string]: any };
type WithFieldValue<T> = T;
type UpdateData<T> = Partial<T>;
type QueryConstraint = any;

import { supabasePersistenceService } from './supabasePersistenceService';
import type {
  PurchaseOrder,
  Event,
  PurchaseOrderFilters,
  PageCursor,
  PaginatedResult,
} from '../types';

// Re-exporting basic types if needed, or we can clean up consumers later.
// For now, we keep the signature compatible where possible.

export const getAllDocuments = async <T>(collectionRef: any): Promise<T[]> => {
  // collectionRef might be a string now or we just use the path
  const path = typeof collectionRef === 'string' ? collectionRef : collectionRef?.path;
  if (!path) throw new Error('Invalid collection path');
  return supabasePersistenceService.getAll<T>(path);
};

export const getCollection = async <T>(collectionName: string): Promise<T[]> => {
  return supabasePersistenceService.getAll(collectionName);
};

export const setDocument = async <T>(
  collectionName: string,
  id: string,
  data: any
): Promise<void> => {
  return supabasePersistenceService.set(collectionName, id, data);
};

export const addDocument = async <T>(collectionRef: any, data: any): Promise<string> => {
  const path = typeof collectionRef === 'string' ? collectionRef : collectionRef?.path;
  return supabasePersistenceService.create(path, data);
};

export const updateDocument = async <T>(
  collectionName: string,
  id: string,
  data: any
): Promise<void> => {
  return supabasePersistenceService.update(collectionName, id, data);
};

export const deleteDocument = async (collectionName: string, id: string): Promise<void> => {
  return supabasePersistenceService.delete(collectionName, id);
};

export const batchSetDocuments = async <T>(
  collectionName: string,
  documents: { id: string; data: T }[]
): Promise<void> => {
  return supabasePersistenceService.batchSet(collectionName, documents);
};

// Query wrapper - This is tricky because consumers use Firestore QueryConstraints
// We need to support the most common ones or refactor consumers.
// For now, we'll try to support basic queries if possible, or warn.
export const queryDocuments = async <T>(
  collectionRef: any,
  options: { bypassCache?: boolean } = {},
  ...constraints: any[]
): Promise<T[]> => {
  const path = typeof collectionRef === 'string' ? collectionRef : collectionRef?.path;

  // Basic implementation ignoring complex constraints for now
  // In a real migration, we'd map Firestore constraints to Supabase filters
  console.warn(
    'queryDocuments: Complex constraints not fully supported in Supabase migration yet',
    constraints
  );
  return supabasePersistenceService.getAll(path);
};

export const clearCache = (collectionName?: string) => {
  // logic removed
};

export const getPurchaseOrdersPage = async ({
  outletId,
  filters,
  pageSize,
  cursor,
}: {
  outletId: string;
  filters: PurchaseOrderFilters;
  pageSize: number;
  cursor: PageCursor | null;
}): Promise<PaginatedResult<PurchaseOrder>> => {
  // For now, simpler fetch from Supabase. In production we'd want proper pagination.
  const orders = await supabasePersistenceService.getAll<PurchaseOrder>('purchase_orders');
  return {
    items: orders.filter((o) => o.outletId === outletId).slice(0, pageSize),
    nextCursor: null,
    hasMore: false,
  };
};

export const getEventsRange = async ({
  outletId,
  startDate,
  endDate,
}: {
  outletId: string;
  startDate: string;
  endDate: string;
}): Promise<Event[]> => {
  return supabasePersistenceService.query<Event>('events', (query) =>
    query.eq('outlet_id', outletId).gte('date', startDate).lte('date', endDate)
  );
};

export const getDocumentById = async <T>(
  collectionName: string,
  id: string
): Promise<T | undefined> => {
  return supabasePersistenceService.getById<T>(collectionName, id);
};

export const deleteAllDocuments = async (collectionName: string): Promise<void> => {
  console.error('deleteAllDocuments not implemented for Supabase safety');
};

export const batchDeleteDocuments = async (
  collectionName: string,
  ids: string[]
): Promise<void> => {
  // sequential delete for now
  for (const id of ids) {
    await supabasePersistenceService.delete(collectionName, id);
  }
};

export const firestoreService = {
  getAll: getAllDocuments,
  getById: getDocumentById,
  update: updateDocument,
  create: addDocument,
  delete: deleteDocument,
  deleteAll: deleteAllDocuments,
  batchDelete: batchDeleteDocuments,
  query: queryDocuments,
  clearCache: clearCache,
};
