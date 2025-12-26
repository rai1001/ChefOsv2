import { createContext, useContext, useState, ReactNode } from 'react';

interface InventoryContextType {
  activeOutletId: string | null;
  setActiveOutletId: (id: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [activeOutletId, setActiveOutletId] = useState<string | null>(null);

  // Here we could also initialize listeners or global state if needed.
  // For now, it manages the active scope (Outlet) for the inventory module.

  return (
    <InventoryContext.Provider value={{ activeOutletId, setActiveOutletId }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventoryContext() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventoryContext must be used within an InventoryProvider');
  }
  return context;
}
