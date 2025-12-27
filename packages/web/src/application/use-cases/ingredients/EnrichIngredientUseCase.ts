import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { IAIService, EnrichedIngredientData } from '@/domain/interfaces/services/IAIService';

@injectable()
export class EnrichIngredientUseCase {
    constructor(@inject(TYPES.AIService) private aiService: IAIService) { }

    async execute(name: string): Promise<EnrichedIngredientData> {
        return this.aiService.enrichIngredient(name);
    }
}
