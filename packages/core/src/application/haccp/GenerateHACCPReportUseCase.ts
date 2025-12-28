import { IHACCPRepository } from '../../domain/repositories/IHACCPRepository';
import { ValidateHACCPComplianceUseCase, ComplianceReport } from './ValidateHACCPComplianceUseCase';
import { HACCPRecord } from '../../domain/entities/HACCPRecord';

export interface HACCPReport {
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  compliance: ComplianceReport;
  records: HACCPRecord[];
  summary: string;
}

export class GenerateHACCPReportUseCase {
  constructor(
    private readonly repository: IHACCPRepository,
    private readonly validateCompliance: ValidateHACCPComplianceUseCase
  ) {}

  async execute(outletId: string, date: Date): Promise<HACCPReport> {
    // 1. Get Compliance Report
    const compliance = await this.validateCompliance.execute(outletId, date);

    // 2. Get Raw Records
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const records = await this.repository.getRecordsByOutlet(outletId, startOfDay, endOfDay);

    // 3. Generate Summary Text
    const summary =
      `HACCP Report for ${date.toDateString()}. Score: ${compliance.complianceScore}%. ` +
      `Completed: ${compliance.completedCheckpoints}/${compliance.totalCheckpoints}. ` +
      `Missed: ${compliance.missingCheckpoints.length}. ` +
      `Failed & Explicitly Resolved: ${compliance.resolvedCheckpoints.length}. ` +
      `Failed & Unresolved: ${compliance.failedCheckpoints.length}.`;

    return {
      generatedAt: new Date(),
      periodStart: startOfDay,
      periodEnd: endOfDay,
      compliance,
      records,
      summary,
    };
  }
}
