import type { StateCreator } from 'zustand';
import type { AppState, EventSlice, Event } from '@/presentation/store/types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { setDocument, getEventsRange, deleteDocument, batchSetDocuments, batchDeleteDocuments } from '@/services/firestoreService';

export const createEventSlice: StateCreator<
    AppState,
    [],
    [],
    EventSlice
> = (set, get) => ({
    events: [],
    eventsLoading: false,
    eventsError: null,
    eventsRange: null,

    setEvents: (events: Event[]) => set({ events }),

    addEvent: async (event: Event) => {
        set((state) => ({ events: [...state.events, event] }));
        try {
            await setDocument("events", event.id, event);
            // Reload current range if active
            const { eventsRange } = get();
            if (eventsRange) {
                get().fetchEventsRange(eventsRange.start, eventsRange.end);
            }
        } catch (error) {
            console.error("Failed to add event", error);
        }
    },

    addEvents: async (newEvents: Event[]) => {
        set((state) => ({ events: [...state.events, ...newEvents] }));
        try {
            const documents = newEvents.map((e: Event) => ({ id: e.id, data: e }));
            await batchSetDocuments("events", documents);
            // Reload range
            const { eventsRange } = get();
            if (eventsRange) {
                get().fetchEventsRange(eventsRange.start, eventsRange.end);
            }
        } catch (error) {
            console.error("Failed to batch add events", error);
        }
    },

    clearEvents: async () => {
        const { activeOutletId } = get();
        if (!activeOutletId) return;

        set({ eventsLoading: true });

        try {
            // First, fetch ALL events for this outlet (not just current range)
            const colRef = collection(db, "events");
            const q = query(colRef, where("outletId", "==", activeOutletId));
            const snapshot = await getDocs(q);

            const idsToDelete = snapshot.docs.map(doc => doc.id);

            if (idsToDelete.length > 0) {
                await batchDeleteDocuments("events", idsToDelete);
            }

            set({ events: [], eventsLoading: false });

            // Reload range to show empty state
            const { eventsRange } = get();
            if (eventsRange) {
                get().fetchEventsRange(eventsRange.start, eventsRange.end);
            }
        } catch (error) {
            console.error("Failed to clear events", error);
            set({ eventsLoading: false });
            const { eventsRange } = get();
            if (eventsRange) {
                get().fetchEventsRange(eventsRange.start, eventsRange.end);
            }
        }
    },

    updateEvent: async (updatedEvent: Event) => {
        set((state) => ({
            events: state.events.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)),
        }));
        try {
            await setDocument("events", updatedEvent.id, updatedEvent);
            const { eventsRange } = get();
            if (eventsRange) {
                get().fetchEventsRange(eventsRange.start, eventsRange.end);
            }
        } catch (error) {
            console.error("Failed to update event", error);
        }
    },

    deleteEvent: async (id: string) => {
        const previousEvents = get().events;
        set((state) => ({
            events: state.events.filter((e) => e.id !== id),
        }));

        try {
            await deleteDocument("events", id);
            // Optionally reload range, but client-side filter is usually enough for immediate feedback
            const { eventsRange } = get();
            if (eventsRange) {
                get().fetchEventsRange(eventsRange.start, eventsRange.end);
            }
        } catch (error) {
            console.error("Failed to delete event", error);
            // Rollback on error
            set({ events: previousEvents });
        }
    },

    getFilteredEvents: () => {
        // Events are now already filtered by range and outlet in the fetch
        return get().events;
    },

    fetchEventsRange: async (start: string, end: string) => {
        const { activeOutletId } = get();
        if (!activeOutletId) return;

        set({ eventsLoading: true, eventsError: null, eventsRange: { start, end } });

        try {
            const events = await getEventsRange({
                outletId: activeOutletId,
                startDate: start,
                endDate: end
            });
            set({ events, eventsLoading: false });
        } catch (error: any) {
            console.error("Failed to fetch events range", error);
            set({ eventsLoading: false, eventsError: error.message });
        }
    }
});
