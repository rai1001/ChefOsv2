import { Unit } from '../value-objects/Unit';

export enum HaccpResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
  SKIPPED = 'SKIPPED',
}

export interface HACCPRecord {
  id: string;
  controlPointId: string;
  outletId: string;

  // The value recorded (e.g., 4.5)
  value?: number;
  unit?: Unit;

  // The outcome
  result: HaccpResult;

  // If failed, what action was taken
  correctiveActionId?: string;
  correctiveActionNote?: string;

  // Metadata
  performedBy: string; // User ID
  verifiedBy?: string; // Supervisor ID (optional)
  performedAt: Date;
  notes?: string;

  // Evidence
  imgUrl?: string;
}
