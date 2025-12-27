import { Unit } from '@/types';

export interface LabelData {
    title: string;
    type: string; // 'CONGELADO' | 'FRESCO' | ...
    productionDate: string; // ISO String
    expiryDate: string; // ISO String
    batchNumber: string;
    quantity: string;
    unit?: Unit;
    user: string;
    allergens?: string[];
    width?: number;
    height?: number;
    qrData?: {
        id: string;
        name: string;
        expiry: string;
    };
}
