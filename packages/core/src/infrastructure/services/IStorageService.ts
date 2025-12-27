/**
 * Interface para servicios de almacenamiento (Firebase Storage)
 */
export interface IStorageService {
  uploadFile(path: string, file: File | Blob, metadata?: Record<string, string>): Promise<string>;
  getDownloadURL(path: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
  listFiles(path: string): Promise<string[]>;
}
