import {
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  collection,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import type {
  CollectionReference,
  DocumentData,
  WithFieldValue,
  UpdateData,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { supabase } from '@/config/supabase';
import { supabasePersistenceService } from './supabasePersistenceService';
import type {
  PurchaseOrder,
  Event,
  PurchaseOrderFilters,
  PageCursor,
  PaginatedResult,
} from '../types';
import { COLLECTIONS } from '@/config/collections';

// semi-persistent query caching
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const queryCache: Record<string, CacheEntry<any>> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (collectionPath: string, constraints: QueryConstraint[]): string => {
  return `${collectionPath}:${JSON.stringify(constraints.map((c) => c.type))}`;
};

// Generic CRUD operations

export const getAllDocuments = async <T>(collectionRef: CollectionReference<T>): Promise<T[]> => {
  const querySnapshot = await getDocs(collectionRef);
  return querySnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as T);
};

export const getCollection = async <T>(collectionName: string): Promise<T[]> => {
  if (await shouldUseSupabase()) {
    return supabasePersistenceService.getAll(collectionName);
  }
  const colRef = collection(db, collectionName) as CollectionReference<T>;
  return getAllDocuments(colRef);
};

// Helper to strip undefined values (Firestore rejects them)
export const sanitizeData = <T>(data: T): T => {
  const cleanFn = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map((v) => cleanFn(v));
    }
    if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
      const newObj: Record<string, any> = {};
      Object.keys(obj).forEach((key) => {
        const value = (obj as Record<string, any>)[key];
        if (value !== undefined) {
          newObj[key] = cleanFn(value);
        }
      });
      return newObj;
    }
    return obj;
  };
  return cleanFn(data) as T;
};

// Helper for mock DB
const getMockDB = (): Record<string, any[]> | null => {
  if (typeof localStorage === 'undefined') return null;
  const mock = localStorage.getItem('E2E_MOCK_DB');
  return mock ? JSON.parse(mock) : null;
};

const saveMockDB = (data: Record<string, any[]>) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('E2E_MOCK_DB', JSON.stringify(data));
  }
};

// Helper to dispatch mock update event
const dispatchMockUpdate = (collectionName: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('MOCK_DB_UPDATED', { detail: { collection: collectionName } })
    );
  }
};

// Helper to check if we should use Supabase
const shouldUseSupabase = async () => {
  // Check if there is an active Supabase session
  const { data } = await supabase.auth.getSession();
  return !!data.session;
};

export const setDocument = async <T extends DocumentData>(
  collectionName: string,
  id: string,
  data: WithFieldValue<T>
): Promise<void> => {
  if (await shouldUseSupabase()) {
    return supabasePersistenceService.set(collectionName, id, data);
  }
  const mockDB = getMockDB();
  if (mockDB) {
    if (!mockDB[collectionName]) mockDB[collectionName] = [];
    const index = mockDB[collectionName].findIndex((d: any) => d.id === id);
    const docData = sanitizeData({ ...data, id }); // Ensure ID is part of data
    if (index >= 0) {
      mockDB[collectionName][index] = { ...mockDB[collectionName][index], ...docData };
    } else {
      mockDB[collectionName].push(docData);
    }
    saveMockDB(mockDB);
    dispatchMockUpdate(collectionName);
    return;
  }
  const docRef = doc(db, collectionName, id);
  await setDoc(docRef, sanitizeData(data));
};

export const addDocument = async <T extends DocumentData>(
  collectionRef: CollectionReference<T>,
  data: WithFieldValue<T>
): Promise<string> => {
  const mockDB = getMockDB();
  if (mockDB) {
    const collectionName = collectionRef.path;
    if (!mockDB[collectionName]) mockDB[collectionName] = [];
    const id = 'mock-' + Date.now();
    const docData = sanitizeData({ ...data, id });
    mockDB[collectionName].push(docData);
    saveMockDB(mockDB);
    dispatchMockUpdate(collectionName);
    return id;
  }
  const docRef = await addDoc(collectionRef, sanitizeData(data));
  return docRef.id;
};

export const updateDocument = async <T extends DocumentData>(
  collectionName: string,
  id: string,
  data: UpdateData<T>
): Promise<void> => {
  if (await shouldUseSupabase()) {
    return supabasePersistenceService.update(collectionName, id, data);
  }
  const mockDB = getMockDB();
  if (mockDB) {
    if (!mockDB[collectionName]) return;
    const index = mockDB[collectionName].findIndex((d: any) => d.id === id);
    if (index >= 0) {
      mockDB[collectionName][index] = {
        ...mockDB[collectionName][index],
        ...sanitizeData(data as any),
      };
      saveMockDB(mockDB);
      dispatchMockUpdate(collectionName);
    }
    return;
  }
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, sanitizeData(data) as any);
};

export const deleteDocument = async (collectionName: string, id: string): Promise<void> => {
  if (await shouldUseSupabase()) {
    return supabasePersistenceService.delete(collectionName, id);
  }
  const mockDB = getMockDB();
  if (mockDB) {
    if (mockDB[collectionName]) {
      mockDB[collectionName] = mockDB[collectionName].filter((d: { id: string }) => d.id !== id);
      saveMockDB(mockDB);
      dispatchMockUpdate(collectionName);
    }
    return;
  }
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
};

export const batchSetDocuments = async <T extends DocumentData>(
  collectionName: string,
  documents: { id: string; data: T }[]
): Promise<void> => {
  if (await shouldUseSupabase()) {
    return supabasePersistenceService.batchSet(collectionName, documents);
  }
  const mockDB = getMockDB();
  if (mockDB) {
    if (!mockDB[collectionName]) mockDB[collectionName] = [];
    documents.forEach(({ id, data }) => {
      const index = mockDB[collectionName]!.findIndex((d: any) => d.id === id);
      const docData = sanitizeData({ ...data, id });
      if (index >= 0) {
        mockDB[collectionName]![index] = { ...mockDB[collectionName]![index], ...docData };
      } else {
        mockDB[collectionName]!.push(docData);
      }
    });
    saveMockDB(mockDB);
    dispatchMockUpdate(collectionName);
    return;
  }

  // Firestore batch limit is 500
  const chunkSize = 500;
  for (let i = 0; i < documents.length; i += chunkSize) {
    const chunk = documents.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    chunk.forEach(({ id, data }) => {
      const docRef = doc(db, collectionName, id);
      batch.set(docRef, sanitizeData(data));
    });

    await batch.commit();
  }
};

export const queryDocuments = async <T extends DocumentData>(
  collectionRef: CollectionReference<T>,
  options: { bypassCache?: boolean } = {},
  ...constraints: QueryConstraint[]
): Promise<T[]> => {
  const mockDB = getMockDB();
  if (mockDB) {
    const collectionName = collectionRef.path;
    const items = mockDB[collectionName] || [];
    return items as T[];
  }

  const cacheKey = getCacheKey(collectionRef.path, constraints);
  if (
    !options.bypassCache &&
    queryCache[cacheKey] &&
    Date.now() - queryCache[cacheKey].timestamp < CACHE_TTL
  ) {
    return queryCache[cacheKey].data;
  }

  const q = query(collectionRef, ...constraints);
  const querySnapshot = await getDocs(q);
  const data = querySnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as T);

  queryCache[cacheKey] = {
    data,
    timestamp: Date.now(),
  };

  return data;
};

export const clearCache = (collectionName?: string) => {
  if (collectionName) {
    Object.keys(queryCache).forEach((key) => {
      if (key.startsWith(`${collectionName}:`)) {
        delete queryCache[key];
      }
    });
  } else {
    Object.keys(queryCache).forEach((key) => delete queryCache[key]);
  }
};

/**
 * Paginates purchase orders with compound filters.
 * Sorts by date DESC, then ID DESC for deterministic ordering.
 */
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
  if (await shouldUseSupabase()) {
    // For now, simpler fetch from Supabase. In production we'd want proper pagination.
    const orders = await supabasePersistenceService.getAll<PurchaseOrder>('purchase_orders');
    return {
      items: orders.filter((o) => o.outletId === outletId).slice(0, pageSize),
      nextCursor: null,
      hasMore: false,
    };
  }
  const mockDB = getMockDB();
  if (mockDB) {
    let items = mockDB.purchaseOrders || [];

    // Filter by Outlet
    items = items.filter((i: PurchaseOrder) => i.outletId === outletId);

    // Filter by Status
    if (filters.status && filters.status !== 'ALL') {
      items = items.filter((i: PurchaseOrder) => i.status === filters.status);
    }

    // Filter by Supplier
    if (filters.supplierId && filters.supplierId !== 'ALL') {
      if (filters.supplierId === 'SIN_ASIGNAR') {
        items = items.filter((i: PurchaseOrder) => !i.supplierId);
      } else {
        items = items.filter((i: PurchaseOrder) => i.supplierId === filters.supplierId);
      }
    }

    // Sort
    items.sort(
      (a: PurchaseOrder, b: PurchaseOrder) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Pagination (Simple slice for mock)
    // Ignoring cursor for simplicity in E2E unless strictly needed
    const pagedItems = items.slice(0, pageSize);

    return {
      items: pagedItems as PurchaseOrder[],
      nextCursor: null,
      hasMore: items.length > pageSize,
    };
  }

  const constraints: QueryConstraint[] = [where('outletId', '==', outletId)];

  // Apply filters
  if (filters.status && filters.status !== 'ALL') {
    constraints.push(where('status', '==', filters.status));
  }

  if (filters.supplierId !== undefined && filters.supplierId !== 'ALL') {
    if (filters.supplierId === null || filters.supplierId === 'SIN_ASIGNAR') {
      constraints.push(where('supplierId', '==', null));
    } else {
      constraints.push(where('supplierId', '==', filters.supplierId));
    }
  }

  // Sort order: date DESC, __name__ DESC (id)
  constraints.push(orderBy('date', 'desc'));
  constraints.push(orderBy('__name__', 'desc'));

  // Cursor
  if (cursor) {
    constraints.push(startAfter(cursor.lastDate, cursor.lastId));
  }

  // Limit
  constraints.push(limit(pageSize));

  const q = query(collection(db, COLLECTIONS.PURCHASE_ORDERS), ...constraints);
  const snapshot = await getDocs(q);

  // Process results
  const items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as PurchaseOrder);

  let nextCursor: PageCursor | null = null;
  const hasMore = items.length === pageSize;

  if (hasMore && items.length > 0) {
    const lastItem = items[items.length - 1];
    if (lastItem) {
      nextCursor = {
        lastDate: lastItem.date,
        lastId: lastItem.id,
      };
    }
  }

  return { items, nextCursor, hasMore };
};

/**
 * Fetches events within a date range for a specific outlet.
 */
export const getEventsRange = async ({
  outletId,
  startDate,
  endDate,
}: {
  outletId: string;
  startDate: string;
  endDate: string;
}): Promise<Event[]> => {
  if (await shouldUseSupabase()) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('outlet_id', outletId)
      .gte('date', startDate)
      .lte('date', endDate);
    if (error) throw error;
    return (data || []) as Event[];
  }
  const mockDB = getMockDB();
  if (mockDB) {
    const events = mockDB.events || [];
    return events
      .filter((e: Event) => e.outletId === outletId && e.date >= startDate && e.date <= endDate)
      .sort((a: Event, b: Event) => a.date.localeCompare(b.date));
  }

  const constraints: QueryConstraint[] = [
    where('outletId', 'in', [outletId, 'GLOBAL']),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'asc'),
  ];

  const q = query(collection(db, COLLECTIONS.EVENTS), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Event);
};

// Helper for getById
export const getDocumentById = async <T>(
  collectionName: string,
  id: string
): Promise<T | undefined> => {
  const mockDB = getMockDB();
  if (mockDB) {
    return mockDB[collectionName]?.find((d: { id: string }) => d.id === id) as T;
  }
  const d = await getDoc(doc(db, collectionName, id));
  return d.exists() ? ({ id: d.id, ...d.data() } as unknown as T) : undefined;
};

// Batch delete helper
export const deleteAllDocuments = async (collectionName: string): Promise<void> => {
  const mockDB = getMockDB();
  if (mockDB) {
    if (mockDB[collectionName]) {
      mockDB[collectionName] = [];
      saveMockDB(mockDB);
      dispatchMockUpdate(collectionName);
    }
    return;
  }

  const colRef = collection(db, collectionName);
  const snapshot = await getDocs(colRef);

  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
};

export const batchDeleteDocuments = async (
  collectionName: string,
  ids: string[]
): Promise<void> => {
  const mockDB = getMockDB();
  if (mockDB) {
    if (mockDB[collectionName]) {
      mockDB[collectionName] = mockDB[collectionName].filter(
        (d: { id: string }) => !ids.includes(d.id)
      );
      saveMockDB(mockDB);
      dispatchMockUpdate(collectionName);
    }
    return;
  }

  // Firestore batch limit is 500
  const chunkSize = 500;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    chunk.forEach((id) => {
      const docRef = doc(db, collectionName, id);
      batch.delete(docRef);
    });

    await batch.commit();
  }
};

// Unified Service Export
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
