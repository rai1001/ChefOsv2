
import { Shift } from '../../entities/Shift';

export interface IShiftRepository {
    getShifts(filters: { dateStart?: string; dateEnd?: string; employeeId?: string; outletId?: string }): Promise<Shift[]>;
    saveShift(shift: Shift): Promise<void>;
    saveShifts(shifts: Shift[]): Promise<void>;
    deleteShift(shiftId: string): Promise<void>;
    deleteShiftsByDate(date: string, outletId?: string): Promise<void>;
}
