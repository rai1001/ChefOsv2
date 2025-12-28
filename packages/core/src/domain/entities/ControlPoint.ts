import { Unit } from '../value-objects/Unit';

export enum ControlPointType {
  TEMPERATURE = 'TEMPERATURE',
  PH = 'PH',
  VISUAL = 'VISUAL',
  TIME = 'TIME',
  OTHER = 'OTHER',
}

export enum Frequency {
  DAILY = 'DAILY',
  PER_SHIFT = 'PER_SHIFT',
  PER_SERVICE = 'PER_SERVICE',
  WEEKLY = 'WEEKLY',
  ADHOC = 'ADHOC',
}

export interface ControlPointLimits {
  min?: number;
  max?: number;
  target?: number;
  unit?: Unit; // Optional, might use string or full Unit object
  criticalLimitDescription?: string; // "Must be below 5°C"
}

export interface ControlPoint {
  id: string;
  name: string;
  description?: string;
  type: ControlPointType;
  frequency: Frequency;
  limits: ControlPointLimits;
  outletId: string;
  isActive: boolean;
  requiredCorrectiveActions?: string[]; // IDs of possible corrective actions
  createdAt: Date;
  updatedAt: Date;
}
