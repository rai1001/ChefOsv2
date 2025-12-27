import type { StateCreator } from 'zustand';
import type { AppState, NotificationSlice, AppNotification } from '@/presentation/store/types';

export const createNotificationSlice: StateCreator<
    AppState,
    [],
    [],
    NotificationSlice
> = (set) => ({
    notifications: [],
    setNotifications: (notifications: AppNotification[]) => set({ notifications }),
    addNotification: (notification: AppNotification) => set((state) => ({
        notifications: [notification, ...state.notifications]
    })),
    markAsRead: (id: string) => set((state) => ({
        notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        )
    })),
});
