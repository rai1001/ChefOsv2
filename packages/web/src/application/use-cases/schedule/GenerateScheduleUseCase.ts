
import { injectable } from 'inversify';
import { Shift, ShiftType } from '@/domain/entities/Shift';
import { Employee } from '@/domain/entities/Employee';
import { format, getDay, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

// Configuration (Ported from legacy solver.ts)
const MAX_CONSECUTIVE_DAYS = 6;
const MIN_DAYS_OFF_28_DAYS = 8;

@injectable()
export class GenerateScheduleUseCase {
    async execute(params: {
        year: number;
        month: number;
        staff: Employee[];
        history: Shift[];
    }): Promise<{ schedule: Shift[]; debug: string[] }> {
        const { year, month, staff, history } = params;
        const debugLog: string[] = [];
        const log = (msg: string) => {
            if (debugLog.length < 1000) debugLog.push(msg);
        };

        const startDate = startOfMonth(new Date(year, month));
        const endDate = endOfMonth(startDate);
        const days = eachDayOfInterval({ start: startDate, end: endDate });

        const state = new ScheduleState(history);

        for (const day of days) {
            const dateStr = format(day, 'yyyy-MM-dd');
            const coverage = this.getRequiredCoverage(day);

            const candidates = [...staff];
            candidates.sort(() => Math.random() - 0.5);

            candidates.sort((a, b) => {
                const recentA = state.getEmployeeShifts(a.id).filter(s => new Date(s.date) > subDays(day, 7)).length;
                const recentB = state.getEmployeeShifts(b.id).filter(s => new Date(s.date) > subDays(day, 7)).length;
                return recentA - recentB;
            });

            const assignedShifts: Shift[] = [];

            const amCandidates = this.sortByRolePreference(candidates, 'MORNING');
            for (let i = 0; i < coverage.morning; i++) {
                const picked = amCandidates.find(c =>
                    !assignedShifts.some(s => s.employeeId === c.id) &&
                    this.checkConstraints(c, day, 'MORNING', state).valid
                );
                if (picked) {
                    const shift: Shift = { id: crypto.randomUUID(), date: dateStr, employeeId: picked.id, type: 'MORNING' };
                    assignedShifts.push(shift);
                    state.addShift(shift);
                }
            }

            const pmCandidates = this.sortByRolePreference(candidates, 'AFTERNOON');
            for (let i = 0; i < coverage.afternoon; i++) {
                const picked = pmCandidates.find(c =>
                    !assignedShifts.some(s => s.employeeId === c.id) &&
                    this.checkConstraints(c, day, 'AFTERNOON', state).valid
                );
                if (picked) {
                    const shift: Shift = { id: crypto.randomUUID(), date: dateStr, employeeId: picked.id, type: 'AFTERNOON' };
                    assignedShifts.push(shift);
                    state.addShift(shift);
                }
            }

            if (assignedShifts.length < (coverage.morning + coverage.afternoon)) {
                log(`[WARNING] Understaffed ${dateStr}`);
            }
        }

        return {
            schedule: Array.from(state.shifts.values()).flat().filter(s => {
                const d = new Date(s.date);
                return d.getMonth() === month && d.getFullYear() === year;
            }),
            debug: debugLog
        };
    }

    private getRequiredCoverage(date: Date) {
        const day = getDay(date);
        if (day === 5 || day === 6 || day === 0) return { morning: 2, afternoon: 1 };
        return { morning: 1, afternoon: 1 };
    }

    private sortByRolePreference(candidates: Employee[], shift: 'MORNING' | 'AFTERNOON') {
        return [...candidates].sort((a, b) => {
            const score = (r: string) => {
                if (shift === 'MORNING') {
                    if (r === 'COOK_MORNING') return 2;
                    if (r === 'COOK_ROTATING') return 1;
                    return 0;
                } else {
                    if (r === 'COOK_ROTATING') return 2;
                    if (r === 'HEAD_CHEF') return 1;
                    return -1;
                }
            };
            return score(b.role) - score(a.role);
        });
    }

    private checkConstraints(employee: Employee, date: Date, type: ShiftType, state: ScheduleState) {
        const dateStr = format(date, 'yyyy-MM-dd');
        const history = state.getEmployeeShifts(employee.id);

        if (employee.vacationDates?.includes(dateStr)) return { valid: false };
        if (employee.role === 'COOK_MORNING' && type === 'AFTERNOON') return { valid: false };
        if (history.some(s => s.date === dateStr)) return { valid: false };

        if (type === 'MORNING') {
            const prevDate = format(subDays(date, 1), 'yyyy-MM-dd');
            if (history.find(s => s.date === prevDate)?.type === 'AFTERNOON') return { valid: false };
        }

        let streak = 0;
        for (let i = 1; i <= MAX_CONSECUTIVE_DAYS; i++) {
            if (history.some(s => s.date === format(subDays(date, i), 'yyyy-MM-dd'))) streak++;
            else break;
        }
        if (streak >= MAX_CONSECUTIVE_DAYS) return { valid: false };

        const windowStart = subDays(date, 27);
        const workedCount = history.filter(s => new Date(s.date) >= windowStart && new Date(s.date) < date).length;
        if (workedCount + 1 > (28 - MIN_DAYS_OFF_28_DAYS)) return { valid: false };

        const dMinus1 = format(subDays(date, 1), 'yyyy-MM-dd');
        const dMinus2 = format(subDays(date, 2), 'yyyy-MM-dd');
        const worked1 = history.some(s => s.date === dMinus1);
        const worked2 = history.some(s => s.date === dMinus2);
        if (!worked1 && worked2) return { valid: false };

        return { valid: true };
    }
}

class ScheduleState {
    shifts = new Map<string, Shift[]>();
    employeeHistory = new Map<string, Shift[]>();

    constructor(history: Shift[]) {
        history.forEach(s => this.addShift(s));
    }

    addShift(shift: Shift) {
        if (!this.shifts.has(shift.date)) this.shifts.set(shift.date, []);
        this.shifts.get(shift.date)!.push(shift);
        if (!this.employeeHistory.has(shift.employeeId)) this.employeeHistory.set(shift.employeeId, []);
        this.employeeHistory.get(shift.employeeId)!.push(shift);
    }

    getEmployeeShifts(id: string) {
        return this.employeeHistory.get(id) || [];
    }
}
