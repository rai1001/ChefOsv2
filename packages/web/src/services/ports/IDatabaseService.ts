export interface QueryFilter {
    field: string;
    operator: '==' | '>=' | '<=' | '>' | '<' | 'array-contains' | 'in' | 'array-contains-any';
    value: unknown;
}

export interface QueryOptions {
    filters?: QueryFilter[];
    orderBy?: { field: string; direction: 'asc' | 'desc' }[];
    limit?: number;
    startAfter?: unknown;
}

export interface IDatabaseService {
    getDocument<T>(collection: string, id: string): Promise<T | null>;
    queryDocuments<T>(collection: string, options?: QueryOptions): Promise<T[]>;
    addDocument<T>(collection: string, data: T): Promise<string>;
    setDocument<T>(collection: string, id: string, data: T): Promise<void>;
    updateDocument<T>(collection: string, id: string, data: Partial<T>): Promise<void>;
    deleteDocument(collection: string, id: string): Promise<void>;

    // Batch operations
    batchUpdate<T>(collection: string, updates: { id: string; data: Partial<T> }[]): Promise<void>;
}
