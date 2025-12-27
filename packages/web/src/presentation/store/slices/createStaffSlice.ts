import type { StateCreator } from 'zustand';
import type { AppState, StaffSlice, Employee, DailySchedule, ShiftType } from '@/presentation/store/types';
import { setDocument, deleteDocument, getDocumentById, updateDocument } from '@/services/firestoreService';
import { COLLECTIONS } from '@/config/collections';

export const createStaffSlice: StateCreator<
    AppState,
    [],
    [],
    StaffSlice
> = (set, get) => ({
    staff: [],
    schedule: {},
    setStaff: (staff: Employee[]) => set({ staff }),

    addEmployee: async (employee: Employee) => {
        set((state) => ({ staff: [...state.staff, employee] }));
        try {
            await setDocument(COLLECTIONS.STAFF, employee.id, employee);
        } catch (error) {
            console.error("Failed to add employee", error);
        }
    },

    updateEmployee: async (employee: Employee) => {
        set((state) => ({
            staff: state.staff.map(e => e.id === employee.id ? employee : e)
        }));
        try {
            await updateDocument(COLLECTIONS.STAFF, employee.id, employee);
        } catch (error) {
            console.error("Failed to update employee", error);
        }
    },

    deleteEmployee: async (id: string) => {
        set((state) => ({ staff: state.staff.filter(e => e.id !== id) }));
        try {
            await deleteDocument(COLLECTIONS.STAFF, id);
        } catch (error) {
            console.error("Failed to delete employee", error);
        }
    },

    updateSchedule: (month: string, data: DailySchedule) => set((state) => ({
        schedule: {
            ...state.schedule,
            [month]: data
        }
    })),

    updateShift: (dateStr: string, employeeId: string, type: ShiftType) => set((state) => {
        const date = new Date(dateStr);
        const monthKey = date.toISOString().slice(0, 7);
        const currentMonthSchedule = state.schedule[monthKey];

        if (!currentMonthSchedule) return state;

        const newShifts = currentMonthSchedule.shifts.filter(s => !(s.date === dateStr && s.employeeId === employeeId));
        newShifts.push({
            date: dateStr,
            employeeId,
            type
        });

        return {
            schedule: {
                ...state.schedule,
                [monthKey]: {
                    ...currentMonthSchedule,
                    shifts: newShifts
                }
            }
        };
    }),

    removeShift: (dateStr: string, employeeId: string) => set((state) => {
        const date = new Date(dateStr);
        const monthKey = date.toISOString().slice(0, 7);
        const currentMonthSchedule = state.schedule[monthKey];

        if (!currentMonthSchedule) return state;

        return {
            schedule: {
                ...state.schedule,
                [monthKey]: {
                    ...currentMonthSchedule,
                    shifts: currentMonthSchedule.shifts.filter(s => !(s.date === dateStr && s.employeeId === employeeId))
                }
            }
        };
    }),

    saveSchedule: async (month: string) => {
        const { schedule, activeOutletId } = get();
        if (!activeOutletId) return;
        const monthData = schedule[month];
        if (!monthData) return;

        try {
            await setDocument(COLLECTIONS.SCHEDULE, `${activeOutletId}_${month}`, {
                ...monthData,
                outletId: activeOutletId,
                month
            });
            console.log(`Schedule saved for ${month}`);
        } catch (error) {
            console.error("Failed to save schedule", error);
            throw error;
        }
    },

    fetchSchedule: async (month: string) => {
        const { activeOutletId } = get();
        if (!activeOutletId) return;

        try {
            const data = await getDocumentById<any>(COLLECTIONS.SCHEDULE, `${activeOutletId}_${month}`);
            if (data) {
                set((state) => ({
                    schedule: {
                        ...state.schedule,
                        [month]: data
                    }
                }));
            }
        } catch (error) {
            console.error("Failed to fetch schedule", error);
        }
    },
});
