import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { IAIService, ScannedDocumentResult } from '@/domain/interfaces/services/IAIService';

@injectable()
export class ScanSportsMenuUseCase {
    constructor(
        @inject(TYPES.AIService) private aiService: IAIService
    ) { }

    async execute(file: File | string): Promise<ScannedDocumentResult> {
        return await this.aiService.scanSportsMenu(file);
    }
}
