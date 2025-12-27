import { FichaTecnica, CreateFichaTecnicaDTO } from '../../domain/entities/FichaTecnica';
import { IFichaTecnicaRepository } from '../../domain/interfaces/repositories/IFichaTecnicaRepository';

export class CreateFichaTecnicaUseCase {
  constructor(private readonly repository: IFichaTecnicaRepository) {}

  async execute(dto: CreateFichaTecnicaDTO): Promise<FichaTecnica> {
    // Validation could go here
    if (!dto.name) throw new Error('Name is required');
    if (!dto.outletId) throw new Error('Outlet ID is required');

    return this.repository.create(dto);
  }
}
