
import { injectable } from 'inversify';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { IEmployeeRepository } from '@/domain/interfaces/repositories/IEmployeeRepository';
import { Employee } from '@/domain/entities/Employee';

@injectable()
export class FirebaseEmployeeRepository implements IEmployeeRepository {
    private readonly collectionName = 'employees';

    async getEmployees(outletId?: string): Promise<Employee[]> {
        const constraints = [];
        if (outletId) constraints.push(where('outletId', '==', outletId));
        const q = query(collection(db, this.collectionName), ...constraints);
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
    }

    async getEmployeeById(id: string): Promise<Employee | null> {
        const snapshot = await getDoc(doc(db, this.collectionName, id));
        if (!snapshot.exists()) return null;
        return { id: snapshot.id, ...snapshot.data() } as Employee;
    }

    async saveEmployee(employee: Employee): Promise<void> {
        await setDoc(doc(db, this.collectionName, employee.id), employee);
    }

    async deleteEmployee(id: string): Promise<void> {
        await deleteDoc(doc(db, this.collectionName, id));
    }
}
