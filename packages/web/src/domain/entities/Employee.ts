export type EmployeeRole =
  | 'HEAD_CHEF'
  | 'SOUS_CHEF'
  | 'CHEF_PARTIE'
  | 'COOK_MORNING'
  | 'COOK_ROTATING'
  | 'ASSISTANT'
  | 'DISHWASHER'
  | 'STAFF'
  | 'admin'
  | 'chef';

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  vacationDates?: string[]; // ISO YYYY-MM-DD
  active: boolean; // Deprecated in favor of status? Or kept for compatibility
  status: 'ACTIVE' | 'INACTIVE';
  outletId?: string;

  // Stats for algorithm
  consecutiveWorkDays?: number;
  daysOffInLast28Days?: number;

  // Tracking
  vacationDaysTotal?: number; // Annual allowance, default 30
  sickLeaveDates?: string[]; // ISO Dates (YYYY-MM-DD)
  qualificationDocs?: { name: string; url: string; expiryDate?: string }[];
  hourlyRate?: number; // For Prime Cost calculation
}
