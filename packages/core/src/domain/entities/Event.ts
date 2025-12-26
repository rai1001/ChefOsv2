export interface EventMenuItem {
  fichaId: string;
  fichaName: string;
  quantity: number;
  portions: number;
}

export enum EventStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Event/BEO (Banquet Event Order)
 */
export interface Event {
  id: string;
  outletId: string;
  eventName: string;
  eventType: string;
  eventDate: Date;
  numberOfGuests: number;
  menu: EventMenuItem[];
  status: EventStatus;
  clientName?: string;
  contactInfo?: string;
  specialRequests?: string;
  dietaryRestrictions?: string[];
  setupTime?: Date;
  serviceTime?: Date;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventDTO {
  outletId: string;
  eventName: string;
  eventType: string;
  eventDate: Date;
  numberOfGuests: number;
  menu: Omit<EventMenuItem, 'fichaName'>[];
  clientName?: string;
  contactInfo?: string;
  specialRequests?: string;
  dietaryRestrictions?: string[];
  setupTime?: Date;
  serviceTime?: Date;
  notes?: string;
}
