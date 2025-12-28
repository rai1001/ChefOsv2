import { FichaTecnica, CreateFichaTecnicaDTO } from '../../domain/entities/FichaTecnica';
import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';
import { ValidationError } from '../../domain/exceptions/AppError';

/**
 * Use case to create a new Ficha Tecnica (Technical Sheet).
 */
export class CreateFichaTecnicaUseCase {
  constructor(private readonly repository: IFichaTecnicaRepository) {}

  /**
   * Executes the creation logic.
   * @param dto - Data to create the Ficha Tecnica.
   * @returns The created Ficha Tecnica entity.
   * @throws {ValidationError} If name or outletId is missing.
   */
  async execute(dto: CreateFichaTecnicaDTO): Promise<FichaTecnica> {
    // Validation
    if (!dto.name) throw new ValidationError('Name is required');
    if (!dto.outletId) throw new ValidationError('Outlet ID is required');

    return this.repository.create(dto);
  }
}
