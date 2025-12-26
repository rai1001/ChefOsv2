import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { IImportService, ImportResult } from '../../../domain/interfaces/services/IImportService';
import { IAIService } from '../../../domain/interfaces/services/IAIService';

@injectable()
export class ScanDocumentUseCase {
    constructor(
        @inject(TYPES.ImportService) private importService: IImportService,
        @inject(TYPES.AIService) private aiService: IAIService
    ) { }

    async execute(file: File, type: 'ingredient' | 'invoice' | 'menu' = 'ingredient'): Promise<ImportResult> {
        const isImage = file.type.startsWith('image/') || file.type === 'application/pdf';

        if (isImage) {
            // AI Scan
            const result = await this.aiService.scanDocument(file, type);
            // Normalize AI result to ImportResult
            return {
                items: result.items.map(item => ({
                    type: 'ingredient', // Simplify for now
                    data: item,
                    confidence: 0.8 // Arbitrary confidence for AI
                })),
                summary: {
                    total: result.items.length,
                    valid: result.items.length,
                    errors: 0
                }
            };
        } else {
            // Excel/CSV Parse
            return this.importService.parseFile(file, type);
        }
    }
}
