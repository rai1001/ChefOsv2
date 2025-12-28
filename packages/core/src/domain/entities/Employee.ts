import { Money } from '../value-objects/Money';

export enum EmployeeRole {
  CHEF = 'CHEF',
  SOUS_CHEF = 'SOUS_CHEF',
  LINE_COOK = 'LINE_COOK',
  PREP_COOK = 'PREP_COOK',
  DISHWASHER = 'DISHWASHER',
  SERVER = 'SERVER',
  MANAGER = 'MANAGER',
  OTHER = 'OTHER',
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
}

export interface Shift {
  id: string;
  employeeId: string;
  startTime: Date;
  endTime?: Date; // Undefined if currently working
  breakDurationMinutes: number;
  notes?: string;
}

export interface Employee {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email?: string; // Optional for kitchen staff
  phone?: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  hourlyRate: Money;

  // Auth
  pinCode?: string; // For POS/tablet access

  createdAt: Date;
  updatedAt: Date;
}
