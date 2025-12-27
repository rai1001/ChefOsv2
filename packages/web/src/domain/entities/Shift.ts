
export type ShiftType = 'MORNING' | 'AFTERNOON' | 'VACATION' | 'SICK_LEAVE' | 'OFF';

export interface Shift {
    id: string;
    date: string; // ISO YYYY-MM-DD
    employeeId: string;
    type: ShiftType;
    outletId?: string;
    notes?: string;
}
