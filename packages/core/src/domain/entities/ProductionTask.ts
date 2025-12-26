import { Quantity } from '../value-objects/Quantity';

export enum ProductionTaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ProductionStation {
  COLD_KITCHEN = 'cold_kitchen',
  HOT_KITCHEN = 'hot_kitchen',
  PASTRY = 'pastry',
  GRILL = 'grill',
  PREP = 'prep',
  GARDE_MANGER = 'garde_manger',
  BUTCHERY = 'butchery',
  BAKERY = 'bakery',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ProductionTask {
  id: string;
  outletId: string;
  eventId?: string;
  fichaId: string;
  fichaName: string;
  quantity: Quantity;
  station: ProductionStation;
  priority: TaskPriority;
  status: ProductionTaskStatus;
  assignedTo?: string;
  scheduledFor: Date;
  estimatedDuration?: number; // minutos
  actualDuration?: number; // minutos
  startedAt?: Date;
  completedAt?: Date;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductionTaskDTO {
  outletId: string;
  eventId?: string;
  fichaId: string;
  quantity: Quantity;
  station: ProductionStation;
  priority?: TaskPriority;
  assignedTo?: string;
  scheduledFor: Date;
  estimatedDuration?: number;
  notes?: string;
}

export interface UpdateProductionTaskDTO {
  status?: ProductionTaskStatus;
  assignedTo?: string;
  scheduledFor?: Date;
  estimatedDuration?: number;
  notes?: string;
  startedAt?: Date;
  completedAt?: Date;
  actualDuration?: number;
}
