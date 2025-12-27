
export type EmployeeRole = 'HEAD_CHEF' | 'COOK_ROTATING' | 'COOK_MORNING' | 'DISHWASHER' | 'STAFF';

export interface Employee {
    id: string;
    name: string;
    role: EmployeeRole;
    vacationDates?: string[]; // ISO YYYY-MM-DD
    active: boolean;
    outletId?: string;
}
