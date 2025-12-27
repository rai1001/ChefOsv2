export interface ITransactionManager {
  runTransaction<T>(operation: (transaction: unknown) => Promise<T>): Promise<T>;
}
