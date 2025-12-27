import { HACCPTask, HACCPFrequency } from '../../domain/entities/HACCPLog';
import { IHACCPRepository } from '../../infrastructure/repositories/IHACCPRepository';

export class GetDailyHACCPTasksUseCase {
  constructor(private readonly repository: IHACCPRepository) {}

  async execute(outletId: string, date: Date = new Date()): Promise<HACCPTask[]> {
    const allTasks = await this.repository.getTasks(outletId);

    // Filter tasks relevant for "Today" based on frequency
    // Simple implementation for now: DAILY always included.
    // WEEKLY/MONTHLY would need complex scheduling logic (last run date etc.)
    // For MVP, if it's DAILY, it returns. If WEEKLY, maybe we assume every Monday?
    // Let's keep it simple: Return all active tasks and let UI decide or assume DAILY for now.

    // Better logic:
    // const dayOfWeek = date.getDay(); // 0 = Sunday

    return allTasks.filter((task) => {
      if (!task.isActive) return false;
      if (task.frequency === HACCPFrequency.DAILY) return true;
      // Placeholder for more complex scheduling logic
      return true;
    });
  }
}
