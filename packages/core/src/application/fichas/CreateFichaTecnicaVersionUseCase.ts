import { FichaTecnicaVersion } from '../../domain/entities/FichaTecnica';
import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';

export class CreateFichaTecnicaVersionUseCase {
  constructor(private readonly repository: IFichaTecnicaRepository) {}

  async execute(
    fichaId: string,
    reason?: string,
    createdBy?: string
  ): Promise<FichaTecnicaVersion> {
    const currentFicha = await this.repository.findById(fichaId);
    if (!currentFicha) {
      throw new Error('Ficha Tecnica not found');
    }

    const versionData: Omit<FichaTecnicaVersion, 'id' | 'createdAt'> = {
      fichaId: currentFicha.id,
      versionNumber: currentFicha.version,
      snapshot: currentFicha,
      createdBy: createdBy || 'system',
      reason: reason,
    };

    // Assuming createVersion implementation in repository handles ID generation and timestamps
    return this.repository.createVersion(versionData);
  }
}
