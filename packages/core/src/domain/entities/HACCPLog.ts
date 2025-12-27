export enum HACCPFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export interface HACCPTask {
  id: string;
  outletId: string;
  name: string;
  description?: string;
  frequency: HACCPFrequency;
  criticalLimits?: {
    min?: number;
    max?: number;
    target?: number;
    unit?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HACCPLog {
  id: string;
  outletId: string;
  taskId: string;
  taskName: string; // Snapshot of task name
  value: string | number;
  isCompliant: boolean;
  correctiveAction?: string;
  verifiedBy: string;
  createdAt: Date;
  notes?: string;
  images?: string[];
}

export interface CreateHACCPLogDTO {
  outletId: string;
  taskId: string;
  value: string | number;
  verifiedBy: string;
  correctiveAction?: string;
  notes?: string;
  images?: string[];
}
