import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { GetIngredientsUseCase as CoreUseCase } from '@culinaryos/core';
import { Ingredient as CoreIngredient } from '@culinaryos/core';

@injectable()
export class GetIngredientsUseCase {
  constructor(@inject(TYPES.CoreGetIngredientsUseCase) private coreUseCase: CoreUseCase) {}

  async execute(outletId: string = ''): Promise<CoreIngredient[]> {
    return await this.coreUseCase.execute(outletId);
  }
}
