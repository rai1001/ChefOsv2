import { useStore } from '@/presentation/store/useStore';

export const useOutletScoping = () => {
    const { activeOutletId, outlets } = useStore();

    // Check if the current outlet ID is valid (exists in the list)
    // If activeOutletId is null, it's invalid.
    const activeOutlet = outlets.find(o => o.id === activeOutletId);
    const isValidOutlet = !!activeOutlet;

    return {
        activeOutletId,
        activeOutletName: activeOutlet?.name || 'Inventario Global', // Fallback name
        outlets,
        isValidOutlet,
        // Helper to check if an arbitrary item belongs to current scope
        isScoped: (itemOutletId?: string) => {
            if (!activeOutletId) return true; // If no scope selected, maybe show all? Or show none. 
            // Design choice: If no outlet selected, show nothing or warn.
            // For now, strict scoping:
            return itemOutletId === activeOutletId;
        }
    };
};
