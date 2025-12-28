import { IStaffRepository } from '../../domain/repositories/IStaffRepository';
import { Shift } from '../../domain/entities/Employee';

export enum TimeAction {
  CLOCK_IN = 'CLOCK_IN',
  CLOCK_OUT = 'CLOCK_OUT',
}

export class TrackTimeUseCase {
  constructor(private readonly repository: IStaffRepository) {}

  async execute(employeeId: string, action: TimeAction, notes?: string): Promise<Shift> {
    const openShift = await this.repository.getOpenShift(employeeId);

    if (action === TimeAction.CLOCK_IN) {
      if (openShift) {
        throw new Error('Employee already clocked in');
      }

      const newShift: Shift = {
        id: crypto.randomUUID(),
        employeeId,
        startTime: new Date(),
        breakDurationMinutes: 0,
        notes,
      };

      await this.repository.saveShift(newShift);
      return newShift;
    }

    if (action === TimeAction.CLOCK_OUT) {
      if (!openShift) {
        throw new Error('No open shift found to clock out from');
      }

      openShift.endTime = new Date();
      if (notes) openShift.notes = (openShift.notes ? openShift.notes + '\n' : '') + notes;

      await this.repository.saveShift(openShift);
      return openShift;
    }

    throw new Error('Invalid action');
  }
}
