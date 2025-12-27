import { ITransactionManager } from '@culinaryos/core';
import { db } from '@/config/firebase'; // Adjust path if needed
import { runTransaction, Transaction } from 'firebase/firestore';

export class FirestoreTransactionManager implements ITransactionManager {
  async runTransaction<T>(operation: (transaction: unknown) => Promise<T>): Promise<T> {
    return runTransaction(db, async (firebaseTransaction: Transaction) => {
      // Pass the fully typed firebaseTransaction to the operation
      // The operation (consumer) will treat it as 'unknown' but pass it back to Repositories
      // which will cast it back to 'Transaction'.
      return await operation(firebaseTransaction);
    });
  }
}
