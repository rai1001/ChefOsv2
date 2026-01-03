import type { StateCreator } from 'zustand';
import type { AppState, EventSlice, Event } from '@/presentation/store/types';
import { container } from '@/application/di/Container';
import { TYPES } from '@/application/di/types';
import { IEventRepository } from '@/domain/interfaces/repositories/IEventRepository';

const getRepo = () => container.get<IEventRepository>(TYPES.EventRepository);

export const createEventSlice: StateCreator<AppState, [], [], EventSlice> = (set, get) => ({
  events: [],
  eventsLoading: false,
  eventsError: null,
  eventsRange: null,

  setEvents: (events: Event[]) => set({ events }),

  addEvent: async (event: Event) => {
    set((state) => ({ events: [...state.events, event] }));
    try {
      await getRepo().saveEvent(event);
      const { eventsRange } = get();
      if (eventsRange) {
        get().fetchEventsRange(eventsRange.start, eventsRange.end);
      }
    } catch (error) {
      console.error('Failed to add event', error);
    }
  },

  addEvents: async (newEvents: Event[]) => {
    set((state) => ({ events: [...state.events, ...newEvents] }));
    try {
      await getRepo().saveEvents(newEvents);
      const { eventsRange } = get();
      if (eventsRange) {
        get().fetchEventsRange(eventsRange.start, eventsRange.end);
      }
    } catch (error) {
      console.error('Failed to batch add events', error);
    }
  },

  clearEvents: async () => {
    const { activeOutletId } = get();
    if (!activeOutletId) return;

    set({ eventsLoading: true });

    try {
      const repo = getRepo();
      const events = await repo.getEvents({ outletId: activeOutletId });
      for (const event of events) {
        await repo.deleteEvent(event.id);
      }

      set({ events: [], eventsLoading: false });

      const { eventsRange } = get();
      if (eventsRange) {
        get().fetchEventsRange(eventsRange.start, eventsRange.end);
      }
    } catch (error) {
      console.error('Failed to clear events', error);
      set({ eventsLoading: false });
    }
  },

  updateEvent: async (updatedEvent: Event) => {
    set((state) => ({
      events: state.events.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)),
    }));
    try {
      await getRepo().saveEvent(updatedEvent);
      const { eventsRange } = get();
      if (eventsRange) {
        get().fetchEventsRange(eventsRange.start, eventsRange.end);
      }
    } catch (error) {
      console.error('Failed to update event', error);
    }
  },

  deleteEvent: async (id: string) => {
    const previousEvents = get().events;
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    }));

    try {
      await getRepo().deleteEvent(id);
      const { eventsRange } = get();
      if (eventsRange) {
        get().fetchEventsRange(eventsRange.start, eventsRange.end);
      }
    } catch (error) {
      console.error('Failed to delete event', error);
      set({ events: previousEvents });
    }
  },

  getFilteredEvents: () => {
    return get().events;
  },

  fetchEventsRange: async (start: string, end: string) => {
    const { activeOutletId } = get();
    if (!activeOutletId) return;

    set({ eventsLoading: true, eventsError: null, eventsRange: { start, end } });

    try {
      const events = await getRepo().getEvents({
        outletId: activeOutletId,
        dateStart: start,
        dateEnd: end,
      });
      set({ events, eventsLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch events range', error);
      set({ eventsLoading: false, eventsError: error.message });
    }
  },
});
