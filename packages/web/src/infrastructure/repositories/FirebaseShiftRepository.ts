
import { injectable } from 'inversify';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { IShiftRepository } from '@/domain/interfaces/repositories/IShiftRepository';
import { Shift } from '@/domain/entities/Shift';

@injectable()
export class FirebaseShiftRepository implements IShiftRepository {
    private readonly collectionName = 'shifts';

    async getShifts(filters: { dateStart?: string; dateEnd?: string; employeeId?: string; outletId?: string }): Promise<Shift[]> {
        const constraints = [];
        if (filters.outletId) constraints.push(where('outletId', '==', filters.outletId));
        if (filters.employeeId) constraints.push(where('employeeId', '==', filters.employeeId));
        if (filters.dateStart) constraints.push(where('date', '>=', filters.dateStart));
        if (filters.dateEnd) constraints.push(where('date', '<=', filters.dateEnd));

        const q = query(collection(db, this.collectionName), ...constraints);
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shift));
    }

    async saveShift(shift: Shift): Promise<void> {
        await setDoc(doc(db, this.collectionName, shift.id), shift);
    }

    async saveShifts(shifts: Shift[]): Promise<void> {
        const batch = writeBatch(db);
        shifts.forEach(s => {
            const ref = doc(db, this.collectionName, s.id);
            batch.set(ref, s);
        });
        await batch.commit();
    }

    async deleteShift(shiftId: string): Promise<void> {
        await deleteDoc(doc(db, this.collectionName, shiftId));
    }

    async deleteShiftsByDate(date: string, outletId?: string): Promise<void> {
        const constraints = [where('date', '==', date)];
        if (outletId) constraints.push(where('outletId', '==', outletId));
        const q = query(collection(db, this.collectionName), ...constraints);
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
}
