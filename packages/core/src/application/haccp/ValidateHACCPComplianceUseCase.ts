import { IHACCPRepository } from '../../domain/repositories/IHACCPRepository';
import { HaccpResult } from '../../domain/entities/HACCPRecord';
import { ControlPoint } from '../../domain/entities/ControlPoint';

export interface ComplianceReport {
  date: Date;
  outletId: string;
  complianceScore: number; // 0-100
  totalCheckpoints: number;
  completedCheckpoints: number;
  missingCheckpoints: ControlPoint[]; // CPs with no record
  failedCheckpoints: ControlPoint[]; // CPs with FAIL outcome and NO corrective action
  resolvedCheckpoints: ControlPoint[]; // CPs with FAIL outcome but WITH corrective action
}

export class ValidateHACCPComplianceUseCase {
  constructor(private readonly repository: IHACCPRepository) {}

  async execute(outletId: string, date: Date = new Date()): Promise<ComplianceReport> {
    // Define day range
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Get Active Control Points
    // Note: Repository might need filtering by isActive, assume getControlPointsByOutlet returns all or active.
    // Ideally we filter for isActive.
    const allCPs = await this.repository.getControlPointsByOutlet(outletId);
    const activeCPs = allCPs.filter((cp) => cp.isActive);

    // 2. Get Records for the day
    const records = await this.repository.getRecordsByOutlet(outletId, startOfDay, endOfDay);

    // Map records by ControlPointId for easy lookup (latest record per CP usually counts)
    // If multiple records exist for one CP, we take the latest (or most compliant).
    // Let's assume latest for efficiency.
    const recordsMap = new Map();
    records.forEach((r) => {
      const existing = recordsMap.get(r.controlPointId);
      if (!existing || new Date(r.performedAt) > new Date(existing.performedAt)) {
        recordsMap.set(r.controlPointId, r);
      }
    });

    // 3. Evaluate Compliance
    const missing: ControlPoint[] = [];
    const failed: ControlPoint[] = []; // Unresolved failures
    const resolved: ControlPoint[] = []; // Resolved failures
    let validCount = 0;

    for (const cp of activeCPs) {
      const record = recordsMap.get(cp.id);

      if (!record) {
        missing.push(cp);
      } else {
        if (record.result === HaccpResult.PASS) {
          validCount++;
        } else if (record.result === HaccpResult.FAIL) {
          if (record.correctiveActionId) {
            resolved.push(cp);
            validCount++; // Count resolved as compliant? Usually yes.
          } else {
            failed.push(cp);
          }
        } else {
          // SKIPPED, maybe treat as valid or missing depending on business rule.
          // Let's assume passed for now or ignore.
          validCount++;
        }
      }
    }

    const score = activeCPs.length > 0 ? (validCount / activeCPs.length) * 100 : 100;

    return {
      date,
      outletId,
      complianceScore: Math.round(score),
      totalCheckpoints: activeCPs.length,
      completedCheckpoints: validCount,
      missingCheckpoints: missing,
      failedCheckpoints: failed,
      resolvedCheckpoints: resolved,
    };
  }
}
