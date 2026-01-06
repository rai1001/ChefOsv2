import { supabase } from '@/config/supabase';

// Simple camelCase -> snake_case converter for payload keys
const toSnake = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

const convertKeysToSnake = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(convertKeysToSnake);
  }
  if (data && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [toSnake(k), convertKeysToSnake(v)])
    );
  }
  return data;
};

/**
 * A polyfill for the legacy firestoreService that uses Supabase as a backend.
 * This allows migrating existing Zustand slices without rewriting every call.
 */
export const supabasePersistenceService = {
  async getAll<T>(collectionName: string): Promise<T[]> {
    const { data, error } = await supabase.from(collectionName).select('*');

    if (error) throw error;
    return (data || []) as T[];
  },

  async getById<T>(collectionName: string, id: string): Promise<T | undefined> {
    const { data, error } = await supabase.from(collectionName).select('*').eq('id', id).single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'no rows returned'
    return (data as T) || undefined;
  },

  async create<T>(collectionName: string, data: any): Promise<string> {
    const payload = convertKeysToSnake(data);
    const { data: inserted, error } = await supabase
      .from(collectionName)
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return inserted.id;
  },

  async set(collectionName: string, id: string, data: any): Promise<void> {
    const payload = convertKeysToSnake({ ...data, id });
    const { error } = await supabase.from(collectionName).upsert(payload);

    if (error) throw error;
  },

  async update(collectionName: string, id: string, data: any): Promise<void> {
    const payload = convertKeysToSnake(data);
    const { error } = await supabase.from(collectionName).update(payload).eq('id', id);

    if (error) throw error;
  },

  async delete(collectionName: string, id: string): Promise<void> {
    const { error } = await supabase.from(collectionName).delete().eq('id', id);

    if (error) throw error;
  },

  async batchSet(collectionName: string, documents: { id: string; data: any }[]): Promise<void> {
    const dataToUpsert = documents.map((doc) => convertKeysToSnake({ ...doc.data, id: doc.id }));
    const { error } = await supabase.from(collectionName).upsert(dataToUpsert);

    if (error) throw error;
  },

  async query<T>(collectionName: string, queryFn: (query: any) => any): Promise<T[]> {
    let baseQuery = supabase.from(collectionName).select('*');
    const { data, error } = await queryFn(baseQuery);

    if (error) throw error;
    return (data || []) as T[];
  },
};
