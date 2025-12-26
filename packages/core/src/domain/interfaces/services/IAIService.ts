/**
 * Resultado del escaneo de factura
 */
export interface InvoiceScanResult {
  supplier: string;
  invoiceNumber: string;
  invoiceDate: Date;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  confidence: number;
}

/**
 * Resultado del escaneo de BEO/Menu
 */
export interface MenuScanResult {
  eventName?: string;
  eventDate?: Date;
  numberOfGuests?: number;
  menuItems: Array<{
    name: string;
    description?: string;
    portions: number;
  }>;
  dietaryRestrictions?: string[];
  specialRequests?: string;
  confidence: number;
}

/**
 * Sugerencia del Zero Waste Engine
 */
export interface ZeroWasteSuggestion {
  ingredientId: string;
  ingredientName: string;
  expiryDate: Date;
  quantity: number;
  unit: string;
  suggestions: Array<{
    fichaId?: string;
    fichaName: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

/**
 * Interface para servicios de IA (Gemini)
 */
export interface IAIService {
  scanInvoice(imageUrl: string): Promise<InvoiceScanResult>;
  scanMenu(imageUrl: string): Promise<MenuScanResult>;
  generateZeroWasteSuggestions(
    expiringIngredients: Array<{
      id: string;
      name: string;
      quantity: number;
      unit: string;
      expiryDate: Date;
    }>
  ): Promise<ZeroWasteSuggestion[]>;
  chat(message: string, context?: Record<string, unknown>): Promise<string>;
}
