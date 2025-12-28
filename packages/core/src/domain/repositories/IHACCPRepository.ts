import { ControlPoint } from '../entities/ControlPoint';
import { CorrectiveAction } from '../entities/CorrectiveAction';
import { HACCPRecord } from '../entities/HACCPRecord';

export interface IHACCPRepository {
  // Control Points (PCC)
  saveControlPoint(controlPoint: ControlPoint): Promise<void>;
  getControlPoint(id: string): Promise<ControlPoint | null>;
  getControlPointsByOutlet(outletId: string): Promise<ControlPoint[]>;

  // Corrective Actions
  getCorrectiveActions(): Promise<CorrectiveAction[]>;
  getCorrectiveAction(id: string): Promise<CorrectiveAction | null>;

  // Records (Logs)
  saveRecord(record: HACCPRecord): Promise<void>;
  getRecord(id: string): Promise<HACCPRecord | null>;
  getRecordsByOutlet(outletId: string, startDate: Date, endDate: Date): Promise<HACCPRecord[]>;
  getRecordsByControlPoint(controlPointId: string, limit?: number): Promise<HACCPRecord[]>;
}
