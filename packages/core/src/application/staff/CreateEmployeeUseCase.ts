import { IStaffRepository } from '../../domain/repositories/IStaffRepository';
import { Employee, EmployeeRole, EmployeeStatus } from '../../domain/entities/Employee';
import { Money } from '../../domain/value-objects/Money';

export interface CreateEmployeeDTO {
  organizationId: string;
  firstName: string;
  lastName: string;
  role: EmployeeRole;
  hourlyRate: number; // Currency assumed from settings or fixed
  email?: string;
  phone?: string;
  pinCode?: string;
}

export class CreateEmployeeUseCase {
  constructor(private readonly repository: IStaffRepository) {}

  async execute(dto: CreateEmployeeDTO): Promise<Employee> {
    if (!dto.firstName || !dto.lastName) {
      throw new Error('Name is required');
    }

    const employee: Employee = {
      id: crypto.randomUUID(),
      organizationId: dto.organizationId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      status: EmployeeStatus.ACTIVE,
      hourlyRate: new Money(dto.hourlyRate, 'EUR'), // Hardcoded EUR for now, or fetch config
      email: dto.email,
      phone: dto.phone,
      pinCode: dto.pinCode,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.repository.saveEmployee(employee);
    return employee;
  }
}
