export interface ImportItem {
    type: 'ingredient' | 'recipe' | 'menu' | 'inventory';
    data: any;
    confidence: number;
}

export interface ImportResult {
    items: ImportItem[];
    summary: {
        total: number;
        valid: number;
        errors: number;
    };
}

export interface IImportService {
    parseFile(file: File, hintType?: string): Promise<ImportResult>;
    processSmartFile(file: File): Promise<ImportResult>; // Uses AI
}
