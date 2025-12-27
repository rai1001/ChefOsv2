
import { injectable, inject } from 'inversify';
import { IShiftRepository } from '@/domain/interfaces/repositories/IShiftRepository';
import { TYPES } from '../../di/types';
import { Shift } from '@/domain/entities/Shift';

@injectable()
export class GetScheduleUseCase {
    constructor(
        @inject(TYPES.ShiftRepository) private shiftRepository: IShiftRepository
    ) { }

    async execute(filters: { dateStart?: string; dateEnd?: string; outletId?: string }): Promise<Shift[]> {
        return this.shiftRepository.getShifts(filters);
    }
}
