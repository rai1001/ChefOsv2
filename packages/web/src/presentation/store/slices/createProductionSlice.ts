import type { StateCreator } from 'zustand';
import type { AppState, ProductionSlice, KanbanTask, KanbanTaskStatus, Event } from '@/presentation/store/types';
import { setDocument, deleteDocument } from '@/services/firestoreService';

export const createProductionSlice: StateCreator<
    AppState,
    [],
    [],
    ProductionSlice
> = (set, get) => ({
    selectedProductionEventId: null,
    productionTasks: {}, // { eventId: [task1, task2] }

    setSelectedProductionEventId: (eventId: string | null) => set({ selectedProductionEventId: eventId }),

    replaceAllProductionTasks: (tasksByEvent: Record<string, KanbanTask[]>) => set({ productionTasks: tasksByEvent }),

    generateProductionTasks: async (event: Event) => {
        if (!event.menu?.recipes) return;

        const { id: eventId, pax, outletId } = event;

        const newTasks: KanbanTask[] = event.menu.recipes.map((recipe, index) => ({
            id: `${eventId}_${recipe.id}_${index}`,
            eventId: eventId,
            title: recipe.name,
            description: `Partida: ${recipe.station}`,
            quantity: pax,
            unit: 'raciones',
            status: 'todo',
            recipeId: recipe.id,
            outletId: outletId || 'unknown'
        }));

        set((state) => ({
            productionTasks: {
                ...state.productionTasks,
                [eventId]: newTasks
            }
        }));

        try {
            // We save each task as a separate document in 'productionTasks' collection
            const promises = newTasks.map(task => setDocument('productionTasks', task.id, task));
            await Promise.all(promises);
        } catch (error) {
            console.error("Failed to persist generated production tasks", error);
        }
    },

    updateTaskStatus: async (eventId: string, taskId: string, status: KanbanTaskStatus) => {
        const tasks = get().productionTasks[eventId] || [];
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const updatedTask = { ...task, status };

        set((state) => {
            const updatedTasks = tasks.map(t =>
                t.id === taskId ? updatedTask : t
            );
            return {
                productionTasks: {
                    ...state.productionTasks,
                    [eventId]: updatedTasks
                }
            };
        });

        try {
            await setDocument('productionTasks', taskId, updatedTask);
        } catch (error) {
            console.error("Failed to update task status", error);
        }
    },

    clearProductionTasks: async (eventId: string) => {
        const tasks = get().productionTasks[eventId] || [];

        set((state) => {
            const { [eventId]: removed, ...rest } = state.productionTasks;
            return { productionTasks: rest };
        });

        try {
            const promises = tasks.map(task => deleteDocument('productionTasks', task.id));
            await Promise.all(promises);
        } catch (error) {
            console.error("Failed to clear production tasks", error);
        }
    },

    setProductionTasks: (eventId: string, tasks: KanbanTask[]) => {
        set((state) => ({
            productionTasks: {
                ...state.productionTasks,
                [eventId]: tasks
            }
        }));
    },

    toggleTaskTimer: async (eventId: string, taskId: string) => {
        const tasks = get().productionTasks[eventId] || [];
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const isRunning = !!task.timerStart;
        const now = Date.now();
        let updatedTask: KanbanTask;

        if (isRunning) {
            const elapsed = Math.floor((now - task.timerStart!) / 1000);
            updatedTask = {
                ...task,
                timerStart: undefined,
                totalTimeSpent: (task.totalTimeSpent || 0) + elapsed
            };
        } else {
            updatedTask = {
                ...task,
                timerStart: now
            };
        }

        set((state) => {
            const updatedTasks = tasks.map(t => t.id === taskId ? updatedTask : t);
            return {
                productionTasks: { ...state.productionTasks, [eventId]: updatedTasks }
            };
        });

        try {
            await setDocument('productionTasks', taskId, updatedTask);
        } catch (error) {
            console.error("Failed to toggle task timer", error);
        }
    },

    updateTaskSchedule: async (eventId: string, taskId: string, updates: {
        assignedDate?: string;
        shift?: import('@/types').ShiftType;
        assignedEmployeeId?: string;
    }) => {
        const tasks = get().productionTasks[eventId] || [];
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const updatedTask = { ...task, ...updates };

        set((state) => {
            const updatedTasks = tasks.map(t =>
                t.id === taskId ? updatedTask : t
            );
            return {
                productionTasks: { ...state.productionTasks, [eventId]: updatedTasks }
            };
        });

        try {
            await setDocument('productionTasks', taskId, updatedTask);
        } catch (error) {
            console.error("Failed to update task schedule", error);
        }
    },

    addProductionTask: async (eventId: string, task: KanbanTask) => {
        set((state) => ({
            productionTasks: {
                ...state.productionTasks,
                [eventId]: [...(state.productionTasks[eventId] || []), task]
            }
        }));
        try {
            await setDocument('productionTasks', task.id, task);
        } catch (error) {
            console.error("Failed to add production task", error);
        }
    },

    deleteProductionTask: async (eventId: string, taskId: string) => {
        set((state) => ({
            productionTasks: {
                ...state.productionTasks,
                [eventId]: (state.productionTasks[eventId] || []).filter(t => t.id !== taskId)
            }
        }));
        try {
            await deleteDocument('productionTasks', taskId);
        } catch (error) {
            console.error("Failed to delete production task", error);
        }
    }
});
