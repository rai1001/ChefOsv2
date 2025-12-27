import { ITransactionManager } from '../../infrastructure/ITransactionManager';

export class MockTransactionManager implements ITransactionManager {
  async runTransaction<T>(operation: (transaction: any) => Promise<T>): Promise<T> {
    return operation('mock-transaction');
  }
}
