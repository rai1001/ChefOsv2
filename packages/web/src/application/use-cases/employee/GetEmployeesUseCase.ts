
import { injectable, inject } from 'inversify';
import { IEmployeeRepository } from '@/domain/interfaces/repositories/IEmployeeRepository';
import { TYPES } from '../../di/types';
import { Employee } from '@/domain/entities/Employee';

@injectable()
export class GetEmployeesUseCase {
    constructor(
        @inject(TYPES.EmployeeRepository) private employeeRepository: IEmployeeRepository
    ) { }

    async execute(outletId?: string): Promise<Employee[]> {
        return this.employeeRepository.getEmployees(outletId);
    }
}
