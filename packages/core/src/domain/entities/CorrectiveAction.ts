export interface CorrectiveAction {
  id: string;
  code: string; // e.g., 'DISCARD', 'RECOOK'
  description: string;
  requiresSupervisorApproval: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CorrectiveActionId = string;
