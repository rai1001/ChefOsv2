import { FichaTecnicaVersion } from '../../domain/entities/FichaTecnica';
import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';

export class GetFichaTecnicaVersionsUseCase {
  constructor(private readonly repository: IFichaTecnicaRepository) {}

  async execute(fichaId: string): Promise<FichaTecnicaVersion[]> {
    return this.repository.getVersions(fichaId);
  }
}
