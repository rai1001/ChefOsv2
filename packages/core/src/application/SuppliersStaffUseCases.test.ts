import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateSupplierUseCase } from './suppliers/CreateSupplierUseCase';
import { UpdateSupplierUseCase } from './suppliers/UpdateSupplierUseCase';
import { EvaluateSupplierUseCase } from './suppliers/EvaluateSupplierUseCase';
import { CreateEmployeeUseCase } from './staff/CreateEmployeeUseCase';
import { TrackTimeUseCase, TimeAction } from './staff/TrackTimeUseCase';
import { ISupplierRepository } from '../domain/repositories/ISupplierRepository';
import { IStaffRepository } from '../domain/repositories/IStaffRepository';
import { PaymentTerm, SupplierCategory } from '../domain/entities/Supplier';
import { EmployeeRole, EmployeeStatus } from '../domain/entities/Employee';

const mockSupplierRepo = {
  save: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn(),
  delete: vi.fn(),
} as unknown as ISupplierRepository;

const mockStaffRepo = {
  saveEmployee: vi.fn(),
  getEmployee: vi.fn(),
  getEmployeesByOrganization: vi.fn(),
  saveShift: vi.fn(),
  getOpenShift: vi.fn(),
  getShifts: vi.fn(),
} as unknown as IStaffRepository;

describe('Suppliers & Staff Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Suppliers', () => {
    it('should create a supplier', async () => {
      const useCase = new CreateSupplierUseCase(mockSupplierRepo);
      const dto = {
        organizationId: 'org-1',
        name: 'Vendor A',
        category: [SupplierCategory.FOOD],
        paymentTerms: PaymentTerm.NET_30,
      };

      const result = await useCase.execute(dto);

      expect(mockSupplierRepo.save).toHaveBeenCalled();
      expect(result.name).toBe('Vendor A');
      expect(result.rating).toBe(0);
    });

    it('should update supplier rating', async () => {
      const useCase = new EvaluateSupplierUseCase(mockSupplierRepo);
      const supplier = {
        id: 's1',
        organizationId: 'org-1',
        rating: 0,
        updatedAt: new Date(),
      } as any;

      vi.mocked(mockSupplierRepo.findById).mockResolvedValue(supplier);

      const result = await useCase.execute({
        supplierId: 's1',
        organizationId: 'org-1',
        rating: 6, // Should clamp to 5
      });

      expect(result.rating).toBe(5);
      expect(mockSupplierRepo.save).toHaveBeenCalledWith(supplier);
    });
  });

  describe('Staff', () => {
    it('should create an employee', async () => {
      const useCase = new CreateEmployeeUseCase(mockStaffRepo);
      const dto = {
        organizationId: 'org-1',
        firstName: 'John',
        lastName: 'Doe',
        role: EmployeeRole.CHEF,
        hourlyRate: 15,
      };

      const result = await useCase.execute(dto);

      expect(mockStaffRepo.saveEmployee).toHaveBeenCalled();
      expect(result.firstName).toBe('John');
      expect(result.status).toBe(EmployeeStatus.ACTIVE);
      expect(result.hourlyRate.amount).toBe(15);
    });

    it('should clock in successfully', async () => {
      const useCase = new TrackTimeUseCase(mockStaffRepo);
      vi.mocked(mockStaffRepo.getOpenShift).mockResolvedValue(null); // No open shift

      const result = await useCase.execute('emp-1', TimeAction.CLOCK_IN);

      expect(mockStaffRepo.saveShift).toHaveBeenCalled();
      expect(result.startTime).toBeDefined();
      expect(result.endTime).toBeUndefined();
    });

    it('should fail to clock in if already clocked in', async () => {
      const useCase = new TrackTimeUseCase(mockStaffRepo);
      vi.mocked(mockStaffRepo.getOpenShift).mockResolvedValue({ id: 'shift-1' } as any);

      await expect(useCase.execute('emp-1', TimeAction.CLOCK_IN)).rejects.toThrow(
        'already clocked in'
      );
    });

    it('should clock out successfully', async () => {
      const useCase = new TrackTimeUseCase(mockStaffRepo);
      const openShift = { id: 'shift-1', employeeId: 'emp-1', startTime: new Date() } as any;
      vi.mocked(mockStaffRepo.getOpenShift).mockResolvedValue(openShift);

      const result = await useCase.execute('emp-1', TimeAction.CLOCK_OUT, 'Done for day');

      expect(result.endTime).toBeDefined();
      expect(result.notes).toContain('Done for day');
      expect(mockStaffRepo.saveShift).toHaveBeenCalledWith(openShift);
    });
  });
});
