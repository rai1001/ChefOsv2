import { FichaTecnica, UpdateFichaTecnicaDTO } from '../../domain/entities/FichaTecnica';
import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';

export class UpdateFichaTecnicaUseCase {
  constructor(private readonly repository: IFichaTecnicaRepository) {}

  async execute(id: string, dto: UpdateFichaTecnicaDTO): Promise<FichaTecnica> {
    return this.repository.update(id, dto);
  }
}
