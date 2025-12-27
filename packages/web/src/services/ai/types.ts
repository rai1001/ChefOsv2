export type AIFeature =
    | 'beoScanner'
    | 'invoiceScanner'
    | 'sportsMenuScanner'
    | 'zeroWasteEngine'
    | 'universalImporter'
    | 'inventoryOptimization'
    | 'purchaseSuggestion'
    | 'wasteAnalysis'
    | 'menuGenerator'; // Added from existing geminiService functionalities

export interface AICallMetadata {
    outletId: string;
    userId: string;
    [key: string]: any;
}

export interface AIMetrics {
    id?: string;
    timestamp: string; // ISO 8601
    outletId: string;
    userId: string;
    feature: AIFeature;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number; // USD
    latencyMs: number;
    success: boolean;
    errorMessage?: string;
    model: string;
}

export interface BudgetConfig {
    monthly: {
        hardCap: number;
        softCap: number;
        currentSpend: number;
        resetDate: any; // Timestamp
    };
    daily: {
        hardCap: number;
        softCap: number;
        currentSpend: number;
        resetDate: any; // Timestamp
    };
    perFeature: Record<AIFeature, { dailyLimit: number; currentCount: number }>;
    rateLimiting: {
        maxCallsPerMinute: number;
        maxCallsPerHour: number;
        windowStart: any; // Timestamp
    };
}

export interface BudgetCheckResult {
    allowed: boolean;
    reason?: string;
    errorMessage?: string;
}
