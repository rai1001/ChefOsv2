
import { injectable, inject } from 'inversify';
import { IEmployeeRepository } from '@/domain/interfaces/repositories/IEmployeeRepository';
import { TYPES } from '../../di/types';
import { Employee } from '@/domain/entities/Employee';

@injectable()
export class SaveEmployeeUseCase {
    constructor(
        @inject(TYPES.EmployeeRepository) private employeeRepository: IEmployeeRepository
    ) { }

    async execute(employee: Employee): Promise<void> {
        return this.employeeRepository.saveEmployee(employee);
    }
}
