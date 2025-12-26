import { Event, CreateEventDTO, EventMenuItem } from '../../domain/entities/Event';
import { MenuScanResult } from '../../domain/interfaces/services/IAIService';
import { IEventRepository } from '../../domain/interfaces/repositories/IEventRepository';
import { IFichaTecnicaRepository } from '../../domain/interfaces/repositories/IFichaTecnicaRepository';
import { FichaTecnica } from '../../domain/entities/FichaTecnica';
import { ITransactionManager } from '../../domain/interfaces/ITransactionManager';

export interface CreateEventFromBEOInput {
  outletId: string;
  scanResult: MenuScanResult;
  userId: string;
  eventType?: string;
  clientName?: string;
  contactInfo?: string;
}

export interface CreateEventFromBEOResult {
  event: Event;
  warnings: string[];
  unmatchedMenuItems: string[];
}

/**
 * Use Case: Crear un evento desde un BEO escaneado con IA
 *
 * Este use case procesa el resultado del escaneo de un BEO y crea un evento.
 * Intenta hacer match de los items del menú con fichas técnicas existentes.
 */
export class CreateEventFromBEO {
  constructor(
    private readonly eventRepository: IEventRepository,
    private readonly fichaTecnicaRepository: IFichaTecnicaRepository,
    private readonly transactionManager: ITransactionManager
  ) {}

  async execute(input: CreateEventFromBEOInput): Promise<CreateEventFromBEOResult> {
    const warnings: string[] = [];
    const unmatchedMenuItems: string[] = [];

    // Validaciones básicas
    if (!input.scanResult.eventName) {
      throw new Error('Event name is required in scan result');
    }

    if (!input.scanResult.eventDate) {
      throw new Error('Event date is required in scan result');
    }

    if (input.scanResult.menuItems.length === 0) {
      throw new Error('At least one menu item is required');
    }

    if (input.scanResult.confidence < 0.7) {
      warnings.push(
        `Low confidence scan result: ${(input.scanResult.confidence * 100).toFixed(0)}%`
      );
    }

    const event = await this.transactionManager.runTransaction(async (transaction) => {
      // 1. Buscar fichas técnicas que coincidan con los items del menú
      const menuItemsWithFichas = await Promise.all(
        input.scanResult.menuItems.map(async (menuItem) => {
          // Buscar ficha técnica por nombre (fuzzy match)
          const fichas = await this.fichaTecnicaRepository.findByOutletId(input.outletId);
          const matchedFicha = fichas.find(
            (f: FichaTecnica) =>
              f.name.toLowerCase().includes(menuItem.name.toLowerCase()) ||
              menuItem.name.toLowerCase().includes(f.name.toLowerCase())
          );

          if (!matchedFicha) {
            warnings.push(`No matching recipe found for menu item: ${menuItem.name}`);
            unmatchedMenuItems.push(menuItem.name);
            return null;
          }

          return {
            fichaId: matchedFicha.id,
            fichaName: matchedFicha.name,
            quantity: 1, // Default to 1 recipe execution
            portions: menuItem.portions,
          };
        })
      );

      // Filtrar items que no tienen ficha técnica
      const validMenuItems = menuItemsWithFichas.filter((item) => item !== null);

      if (validMenuItems.length === 0) {
        throw new Error(
          'No menu items could be matched with existing recipes. Please create recipes first.'
        );
      }

      // 2. Crear el DTO para el evento
      const eventDTO: CreateEventDTO = {
        outletId: input.outletId,
        eventName: input.scanResult.eventName!, // Ya validado arriba
        eventType: input.eventType || 'Banquet',
        eventDate: input.scanResult.eventDate!, // Ya validado arriba
        numberOfGuests: input.scanResult.numberOfGuests || 0,
        menu: validMenuItems as EventMenuItem[],
        clientName: input.clientName,
        contactInfo: input.contactInfo,
        specialRequests: input.scanResult.specialRequests,
        dietaryRestrictions: input.scanResult.dietaryRestrictions,
      };

      // 3. Crear el evento
      const createdEvent = await this.eventRepository.create(eventDTO, { transaction });

      return createdEvent;
    });

    return {
      event,
      warnings,
      unmatchedMenuItems,
    };
  }
}
