/**
 * Unified Import System Types
 *
 * Defines all types for the universal import system across ChefOsv2
 */

export type ImportType =
  | 'ingredient'
  | 'recipe'
  | 'menu'
  | 'event'
  | 'staff'
  | 'supplier'
  | 'inventory'
  | 'haccp'
  | 'occupancy';

export type ImportMode =
  | 'auto' // Auto-detect best method
  | 'excel' // Structured Excel/CSV parser
  | 'ai' // AI Vision (PDF/Images)
  | 'ics'; // Calendar files

export interface ImportMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ImportValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportResult {
  success: boolean;
  count: number;
  errors: ImportValidationError[];
  duration: number;
  metadata: ImportMetadata;
}

export interface IngestionItem {
  type: ImportType;
  data: any;
}
