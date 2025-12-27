import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { DeleteIngredientUseCase as CoreUseCase } from '@culinaryos/core/use-cases/inventory/DeleteIngredientUseCase';

@injectable()
export class DeleteIngredientUseCase {
  constructor(@inject(TYPES.CoreDeleteIngredientUseCase) private coreUseCase: CoreUseCase) {}

  async execute(id: string): Promise<void> {
    return this.coreUseCase.execute(id);
  }
}
