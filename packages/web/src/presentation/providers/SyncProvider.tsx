import React from 'react';
import { useIngredientsSync } from '@/hooks/sync/useIngredientsSync';
import { useRecipesSync } from '@/hooks/sync/useRecipesSync';
import { useMenusSync } from '@/hooks/sync/useMenusSync';
import { useSuppliersSync } from '@/hooks/sync/useSuppliersSync';
import { useStaffSync } from '@/hooks/sync/useStaffSync';
import { useProductionSync } from '@/hooks/sync/useProductionSync';
import { useOutletsSync } from '@/hooks/sync/useOutletsSync';
import { useEventsSync } from '@/hooks/sync/useEventsSync';
import { usePurchaseOrdersSync } from '@/hooks/sync/usePurchaseOrdersSync';
import { useWasteSync } from '@/hooks/sync/useWasteSync';
import { useHaccpSync } from '@/hooks/sync/useHaccpSync';
import { useInventorySync } from '@/hooks/sync/useInventorySync';

interface SyncProviderProps {
    children: React.ReactNode;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({ children }) => {
    // Mount sync hooks here
    // These hooks will automatically subscribe/unsubscribe based on activeOutletId

    // Outlets (Global)
    useOutletsSync();

    // Outlet-Specific Data
    useIngredientsSync();
    useRecipesSync();
    useMenusSync();
    useSuppliersSync();
    useStaffSync();
    useProductionSync();
    useEventsSync();
    usePurchaseOrdersSync();
    useWasteSync();
    useHaccpSync();
    useInventorySync();

    return <>{children}</>;
};
