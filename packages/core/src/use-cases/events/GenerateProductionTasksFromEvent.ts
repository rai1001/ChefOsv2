import {
  ProductionTask,
  CreateProductionTaskDTO,
  ProductionStation,
  TaskPriority,
} from '../../domain/entities/ProductionTask';
import { IEventRepository } from '../../domain/interfaces/repositories/IEventRepository';
import { IFichaTecnicaRepository } from '../../domain/interfaces/repositories/IFichaTecnicaRepository';
import { IProductionTaskRepository } from '../../domain/interfaces/repositories/IProductionTaskRepository';
import { ITransactionManager } from '../../domain/interfaces/ITransactionManager';

export interface GenerateProductionTasksInput {
  eventId: string;
  userId: string;
  prepTimeBeforeEvent?: number; // horas antes del evento para programar las tareas
}

export interface GenerateProductionTasksResult {
  tasks: ProductionTask[];
  warnings: string[];
}

/**
 * Use Case: Generar Production Tasks desde un Evento
 *
 * Crea tareas de producción para cada item del menú del evento,
 * asignándolas a estaciones y programándolas basándose en el tiempo de preparación.
 */
export class GenerateProductionTasksFromEvent {
  constructor(
    private readonly eventRepository: IEventRepository,
    private readonly fichaTecnicaRepository: IFichaTecnicaRepository,
    private readonly productionTaskRepository: IProductionTaskRepository,
    private readonly transactionManager: ITransactionManager
  ) {}

  async execute(input: GenerateProductionTasksInput): Promise<GenerateProductionTasksResult> {
    const warnings: string[] = [];
    const prepTimeBeforeEvent = input.prepTimeBeforeEvent || 4; // 4 horas por defecto

    // 1. Obtener el evento
    const event = await this.eventRepository.findById(input.eventId);
    if (!event) {
      throw new Error(`Event with ID ${input.eventId} not found`);
    }

    // 2. Crear tareas de producción para cada item del menú
    const tasks: ProductionTask[] = [];

    await this.transactionManager.runTransaction(async (transaction) => {
      for (const menuItem of event.menu) {
        const ficha = await this.fichaTecnicaRepository.findById(menuItem.fichaId);
        if (!ficha) {
          warnings.push(`Recipe ${menuItem.fichaName} not found, skipping task creation`);
          continue;
        }

        // Determinar la estación basándose en la categoría de la ficha
        const station = this.determineStation(ficha.category);

        // Calcular el tiempo de programación
        const totalPrepTime = (ficha.prepTime || 0) + (ficha.cookTime || 0);
        const scheduledTime = new Date(event.eventDate);
        scheduledTime.setHours(scheduledTime.getHours() - prepTimeBeforeEvent);

        // Determinar la prioridad basándose en el tiempo hasta el evento
        const hoursUntilEvent =
          (event.eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
        const priority = this.determinePriority(hoursUntilEvent);

        // Crear el DTO de la tarea
        const taskDTO: CreateProductionTaskDTO = {
          outletId: event.outletId,
          eventId: event.id,
          fichaId: ficha.id,
          quantity: ficha.yield.multiply(menuItem.quantity),
          station,
          priority,
          scheduledFor: scheduledTime,
          estimatedDuration: totalPrepTime,
          notes: `For event: ${event.eventName} - ${event.numberOfGuests} guests`,
        };

        const task = await this.productionTaskRepository.create(taskDTO, { transaction });
        tasks.push(task);
      }
    });

    return {
      tasks,
      warnings,
    };
  }

  private determineStation(category: string): ProductionStation {
    const categoryLower = category.toLowerCase();

    if (
      categoryLower.includes('pastry') ||
      categoryLower.includes('dessert') ||
      categoryLower.includes('baking')
    ) {
      return ProductionStation.PASTRY;
    }
    if (
      categoryLower.includes('grill') ||
      categoryLower.includes('steak') ||
      categoryLower.includes('bbq')
    ) {
      return ProductionStation.GRILL;
    }
    if (
      categoryLower.includes('salad') ||
      categoryLower.includes('cold') ||
      categoryLower.includes('appetizer')
    ) {
      return ProductionStation.COLD_KITCHEN;
    }
    if (categoryLower.includes('butcher') || categoryLower.includes('meat')) {
      return ProductionStation.BUTCHERY;
    }
    if (categoryLower.includes('bread') || categoryLower.includes('bakery')) {
      return ProductionStation.BAKERY;
    }

    // Default a cocina caliente
    return ProductionStation.HOT_KITCHEN;
  }

  private determinePriority(hoursUntilEvent: number): TaskPriority {
    if (hoursUntilEvent < 24) {
      return TaskPriority.CRITICAL;
    }
    if (hoursUntilEvent < 48) {
      return TaskPriority.HIGH;
    }
    if (hoursUntilEvent < 72) {
      return TaskPriority.MEDIUM;
    }
    return TaskPriority.LOW;
  }
}
