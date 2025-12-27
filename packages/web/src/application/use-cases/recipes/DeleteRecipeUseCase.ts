import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { DeleteFichaTecnicaUseCase as CoreUseCase } from '@culinaryos/core';

@injectable()
export class DeleteRecipeUseCase {
  constructor(@inject(TYPES.CoreDeleteRecipeUseCase) private coreUseCase: CoreUseCase) {}

  async execute(id: string): Promise<void> {
    await this.coreUseCase.execute(id);
  }
}
