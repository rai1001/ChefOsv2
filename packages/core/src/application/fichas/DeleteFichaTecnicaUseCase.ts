import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';

export class DeleteFichaTecnicaUseCase {
  constructor(private readonly repository: IFichaTecnicaRepository) {}

  async execute(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
