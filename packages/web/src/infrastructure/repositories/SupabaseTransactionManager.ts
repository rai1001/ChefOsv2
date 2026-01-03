import { injectable } from 'inversify';
import { ITransactionManager } from '@culinaryos/core';

@injectable()
export class SupabaseTransactionManager implements ITransactionManager {
  async runTransaction<T>(operation: (transaction: unknown) => Promise<T>): Promise<T> {
    // Supabase does not support client-side transactions in the same way Firestore does.
    // For now, we simply execute the operation.
    // In the future, this could be replaced by a stored procedure call or ignored if optimistic locking is sufficient.
    return operation(null);
  }
}
