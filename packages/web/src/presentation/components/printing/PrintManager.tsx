import React, { useEffect, useState } from 'react';
import { useStore } from '@/presentation/store/useStore';
import type { LabelData } from './PrintService';
import { PRINT_EVENT } from './PrintService';
import { generateLabelPDF, printBlob } from '@/utils/labelGenerator';

export const PrintManager: React.FC = () => {
    const { currentUser } = useStore();
    const [_isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        const handlePrint = async (e: Event) => {
            const customEvent = e as CustomEvent<LabelData>;
            const data = customEvent.detail;

            setIsPrinting(true);
            try {
                // Map PrintService LabelData to labelGenerator LabelData
                const blob = await generateLabelPDF({
                    title: data.title,
                    type: data.type === 'INGREDIENT' ? 'FRESCO' : data.type === 'PREP' ? 'ELABORADO' : 'BUFFET',
                    productionDate: data.date.toISOString(),
                    expiryDate: data.expiryDate ? data.expiryDate.toISOString() : new Date().toISOString(),
                    batchNumber: data.batchNumber || `AUTO-${Date.now()}`,
                    quantity: data.quantity || '1',
                    user: currentUser?.name || 'Chef OS',
                    allergens: data.allergens
                });
                printBlob(blob);
            } catch (err) {
                console.error("Auto-Print Error", err);
            } finally {
                setIsPrinting(false);
            }
        };

        window.addEventListener(PRINT_EVENT, handlePrint);
        return () => window.removeEventListener(PRINT_EVENT, handlePrint);
    }, [currentUser]);

    return null; // Logic only, no UI (handled by printBlob iframe)
};

