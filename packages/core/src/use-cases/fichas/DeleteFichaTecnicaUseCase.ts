import { IFichaTecnicaRepository } from '../../domain/interfaces/repositories/IFichaTecnicaRepository';

export class DeleteFichaTecnicaUseCase {
  constructor(private readonly repository: IFichaTecnicaRepository) {}

  async execute(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
