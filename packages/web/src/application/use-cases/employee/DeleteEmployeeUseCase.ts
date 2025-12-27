
import { injectable, inject } from 'inversify';
import { IEmployeeRepository } from '@/domain/interfaces/repositories/IEmployeeRepository';
import { TYPES } from '../../di/types';

@injectable()
export class DeleteEmployeeUseCase {
    constructor(
        @inject(TYPES.EmployeeRepository) private employeeRepository: IEmployeeRepository
    ) { }

    async execute(id: string): Promise<void> {
        return this.employeeRepository.deleteEmployee(id);
    }
}
