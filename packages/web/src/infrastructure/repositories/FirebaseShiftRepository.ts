import { injectable } from 'inversify';
import {
  getCollection,
  setDocument,
  deleteDocument,
  batchSetDocuments,
  batchDeleteDocuments,
} from '@/services/firestoreService';
import { IShiftRepository } from '@/domain/interfaces/repositories/IShiftRepository';
import { Shift } from '@/domain/entities/Shift';

@injectable()
export class FirebaseShiftRepository implements IShiftRepository {
  private readonly collectionName = 'shifts';

  async getShifts(filters: {
    dateStart?: string;
    dateEnd?: string;
    employeeId?: string;
    outletId?: string;
  }): Promise<Shift[]> {
    const shifts = await getCollection<Shift>(this.collectionName);

    return shifts.filter((s) => {
      if (filters.outletId && s.outletId !== filters.outletId) return false;
      if (filters.employeeId && (s as any).employeeId !== filters.employeeId) return false;
      if (filters.dateStart && s.date < filters.dateStart) return false;
      if (filters.dateEnd && s.date > filters.dateEnd) return false;
      return true;
    });
  }

  async saveShift(shift: Shift): Promise<void> {
    await setDocument(this.collectionName, shift.id, shift as any);
  }

  async saveShifts(shifts: Shift[]): Promise<void> {
    const docs = shifts.map((s) => ({ id: s.id, data: s }));
    await batchSetDocuments(this.collectionName, docs);
  }

  async deleteShift(shiftId: string): Promise<void> {
    await deleteDocument(this.collectionName, shiftId);
  }

  async deleteShiftsByDate(date: string, outletId?: string): Promise<void> {
    const shifts = await getCollection<Shift>(this.collectionName);
    const toDelete = shifts.filter(
      (s) => s.date === date && (!outletId || s.outletId === outletId)
    );

    if (toDelete.length > 0) {
      await batchDeleteDocuments(
        this.collectionName,
        toDelete.map((s) => s.id)
      );
    }
  }
}
