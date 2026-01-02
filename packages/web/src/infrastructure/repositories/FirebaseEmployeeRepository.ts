import { injectable } from 'inversify';
import {
  getCollection,
  setDocument,
  deleteDocument,
  getDocumentById,
} from '@/services/firestoreService';
import { IEmployeeRepository } from '@/domain/interfaces/repositories/IEmployeeRepository';
import { Employee } from '@/domain/entities/Employee';

@injectable()
export class FirebaseEmployeeRepository implements IEmployeeRepository {
  private readonly collectionName = 'employees';

  async getEmployees(outletId?: string): Promise<Employee[]> {
    const employees = await getCollection<Employee>(this.collectionName);
    if (outletId) {
      return employees.filter((e) => (e as any).outletId === outletId);
    }
    return employees;
  }

  async getEmployeeById(id: string): Promise<Employee | null> {
    const doc = await getDocumentById<Employee>(this.collectionName, id);
    return doc || null;
  }

  async saveEmployee(employee: Employee): Promise<void> {
    await setDocument(this.collectionName, employee.id, employee as any);
  }

  async deleteEmployee(id: string): Promise<void> {
    await deleteDocument(this.collectionName, id);
  }
}
