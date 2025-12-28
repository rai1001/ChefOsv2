import { Employee, Shift } from '../entities/Employee';

export interface IStaffRepository {
  // Employee
  saveEmployee(employee: Employee): Promise<void>;
  getEmployee(id: string): Promise<Employee | null>;
  getEmployeesByOrganization(organizationId: string): Promise<Employee[]>;

  // Time Tracking
  saveShift(shift: Shift): Promise<void>;
  getOpenShift(employeeId: string): Promise<Shift | null>;
  getShifts(employeeId: string, startDate: Date, endDate: Date): Promise<Shift[]>;
}
