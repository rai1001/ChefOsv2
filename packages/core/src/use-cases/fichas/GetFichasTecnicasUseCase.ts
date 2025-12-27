import { FichaTecnica } from '../../domain/entities/FichaTecnica';
import { IFichaTecnicaRepository } from '../../domain/interfaces/repositories/IFichaTecnicaRepository';

export class GetFichasTecnicasUseCase {
  constructor(private readonly repository: IFichaTecnicaRepository) {}

  async execute(outletId: string): Promise<FichaTecnica[]> {
    return this.repository.findByOutletId(outletId);
  }
}
