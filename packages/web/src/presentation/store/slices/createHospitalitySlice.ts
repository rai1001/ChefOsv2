import type { StateCreator } from 'zustand';
import type { AppState, HospitalitySlice, HospitalityService, OccupancyData } from '@/presentation/store/types';
import type { MealType } from '@/types';
import { setDocument } from '@/services/firestoreService';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/config/firebase';

export const createHospitalitySlice: StateCreator<
    AppState,
    [],
    [],
    HospitalitySlice
> = (set, get) => ({
    hospitalityServices: [],

    setHospitalityServices: (services: HospitalityService[]) => set({ hospitalityServices: services }),

    updateHospitalityService: async (service: HospitalityService) => {
        // Optimistic update
        set((state) => {
            const index = state.hospitalityServices.findIndex(s => s.id === service.id);
            if (index >= 0) {
                const updated = [...state.hospitalityServices];
                updated[index] = service;
                return { hospitalityServices: updated };
            } else {
                return { hospitalityServices: [...state.hospitalityServices, service] };
            }
        });

        // Persist
        try {
            const activeOutletId = get().activeOutletId;
            const docData = {
                ...service,
                outletId: service.outletId || activeOutletId
            };
            await setDocument('hospitalityServices', service.id, docData);
        } catch (error) {
            console.error("Failed to persist hospitality service", error);
        }
    },

    importOccupancy: async (data: OccupancyData[]) => {
        const state = get();
        const batch = writeBatch(db);
        const newServices = [...state.hospitalityServices];

        for (const item of data) {
            const mealType: MealType = item.mealType || 'breakfast';
            // Use date string for local ID to match store logic, but Date object for service calls
            const dateStr = typeof item.date === 'string' ? item.date.slice(0, 10) : (item.date as any).toISOString().slice(0, 10);
            const id = `${dateStr}_${mealType}`;
            const existing = newServices.find(s => s.id === id);

            const updatedService: HospitalityService = existing
                ? { ...existing, forecastPax: item.pax || (item as any).estimatedPax || 0 }
                : {
                    id,
                    date: dateStr,
                    mealType,
                    forecastPax: item.pax || (item as any).estimatedPax || 0,
                    realPax: 0,
                    consumption: {},
                    outletId: state.activeOutletId || undefined
                };

            // Update local array
            const index = newServices.findIndex(s => s.id === id);
            if (index >= 0) newServices[index] = updatedService;
            else newServices.push(updatedService);

            // Persist to hospitalityServices
            const docRef = doc(db, 'hospitalityServices', id);
            batch.set(docRef, updatedService, { merge: true });

            // Persist to occupancy (for Dashboard)
            const occupancyRef = doc(db, 'occupancy', id);
            batch.set(occupancyRef, {
                date: item.date,
                estimatedPax: item.pax || (item as any).estimatedPax || 0,
                mealType,
                updatedAt: new Date()
            }, { merge: true });
        }

        set({ hospitalityServices: newServices });

        try {
            await batch.commit();
        } catch (error) {
            console.error("Failed to import occupancy", error);
        }
    },

    fetchHospitalityServices: async (date?: string) => {
        const activeOutletId = get().activeOutletId;
        if (!activeOutletId) {
            set({ hospitalityServices: [] });
            return;
        }

        try {
            const colRef = collection(db, 'hospitalityServices');
            let q = query(colRef, where('outletId', '==', activeOutletId));

            if (date) {
                q = query(q, where('date', '==', date));
            }

            const snapshot = await getDocs(q);
            const items = snapshot.docs.map(doc => ({ ...doc.data() as object, id: doc.id } as HospitalityService));

            set({ hospitalityServices: items });
        } catch (error) {
            console.error("Failed to fetch hospitality services", error);
        }
    },

    commitHospitalityConsumption: async (serviceId: string) => {
        const state = get();
        const service = state.hospitalityServices.find(s => s.id === serviceId);
        if (!service || service.isCommitted) return;

        // 1. Deduct stock for each item in consumption
        Object.entries(service.consumption).forEach(([ingredientId, quantity]) => {
            state.consumeStock(ingredientId, quantity);
        });

        // 2. Mark as committed and persist
        const updatedService = { ...service, isCommitted: true };
        await get().updateHospitalityService(updatedService);
    }
});
