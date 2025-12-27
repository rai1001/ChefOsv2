
import { Employee } from '../../entities/Employee';

export interface IEmployeeRepository {
    getEmployees(outletId?: string): Promise<Employee[]>;
    getEmployeeById(id: string): Promise<Employee | null>;
    saveEmployee(employee: Employee): Promise<void>;
    deleteEmployee(id: string): Promise<void>;
}
