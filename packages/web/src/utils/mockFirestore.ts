export const collection = (db: any, path: string) => ({ path });
export const doc = (db: any, path: string, ...segments: string[]) => ({
  id: segments.join('') || 'mock-id',
  path,
});
export const getDoc = async () => ({ exists: () => false, data: () => ({}), id: 'mock-id' });
export const getDocs = async () => ({ docs: [], empty: true, forEach: () => {} });
export const setDoc = async () => {};
export const updateDoc = async () => {};
export const deleteDoc = async () => {};
export const addDoc = async () => ({ id: 'mock-id' });
export const query = (ref: any, ...constraints: any[]) => ({});
export const where = (field: string, op: string, value: any) => ({});
export const orderBy = (field: string, dir?: string) => ({});
export const limit = (n: number) => ({});
export const startAfter = (...args: any[]) => ({});
export const documentId = () => 'id';
export const serverTimestamp = () => new Date().toISOString();
export const writeBatch = () => ({
  set: () => {},
  update: () => {},
  delete: () => {},
  commit: async () => {},
});
export const onSnapshot = () => () => {}; // Unsubscribe function
export const arrayUnion = (...args: any[]) => args;
export const arrayRemove = (...args: any[]) => args;
export const increment = (n: number) => n;
export const Timestamp = {
  now: () => ({ toDate: () => new Date() }),
  fromDate: (date: Date) => ({ toDate: () => date }),
};
export type DocumentData = any;
export type Query<T = DocumentData> = any;
export type CollectionReference<T = DocumentData> = any;
export type DocumentReference<T = DocumentData> = any;
export type SnapshotOptions = any;
export type FirestoreError = any;
