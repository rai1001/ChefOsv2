import type { Employee, Shift, ShiftType, Role } from '@/types';
import { format, getDay, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

// Configuration
const MAX_CONSECUTIVE_DAYS = 6;
const MIN_DAYS_OFF_28_DAYS = 8;
// valid check 5 uses hardcoded 20 (28-8).

// Helpers
const getDateStr = (date: Date) => format(date, 'yyyy-MM-dd');

const getRequiredCoverage = (date: Date): { morning: number; afternoon: number } => {
    const day = getDay(date);
    // Fri(5), Sat(6), Sun(0) -> 2 AM, 1 PM
    if (day === 5 || day === 6 || day === 0) {
        return { morning: 2, afternoon: 1 };
    }
    // Mon-Thu -> 1 AM, 1 PM
    return { morning: 1, afternoon: 1 };
};

// State Tracker
export class ScheduleState {
    shifts: Map<string, Shift[]>; // By Date string
    employeeHistory: Map<string, Shift[]>; // By Employee ID (past + current planned)

    constructor(history: Shift[] = []) {
        this.shifts = new Map();
        this.employeeHistory = new Map();
        // Initialize history
        history.forEach(s => this.addShift(s));
    }

    addShift(shift: Shift) {
        const dateKey = shift.date;
        if (!this.shifts.has(dateKey)) {
            this.shifts.set(dateKey, []);
        }
        this.shifts.get(dateKey)?.push(shift);

        if (!this.employeeHistory.has(shift.employeeId)) {
            this.employeeHistory.set(shift.employeeId, []);
        }
        const history = this.employeeHistory.get(shift.employeeId)!;
        history.push(shift);
    }

    getEmployeeShifts(employeeId: string): Shift[] {
        return this.employeeHistory.get(employeeId) || [];
    }
}

// Rules Engine
export const checkConstraints = (
    employee: Employee,
    date: Date,
    shiftType: ShiftType,
    state: ScheduleState
): { valid: boolean; reason?: string } => {
    const dateStr = getDateStr(date);
    const employeeShifts = state.getEmployeeShifts(employee.id);

    // 1. Vacation Constraint
    // Check if the employee has a vacation booked for this date
    if (employee.vacationDates?.includes(dateStr)) {
        return { valid: false, reason: 'Vacation' };
    }

    // 2. Role Constraints
    if (employee.role === 'COOK_MORNING' && shiftType === 'AFTERNOON') {
        return { valid: false, reason: 'Morning Fixed Staff cannot work Afternoon' };
    }

    // 2. Already working today?
    const privacyCheck = employeeShifts.find(s => s.date === dateStr);
    if (privacyCheck) {
        return { valid: false, reason: 'Already assigned today' };
    }

    // 3. No PM -> AM next day
    if (shiftType === 'MORNING') {
        const prevDateStr = getDateStr(subDays(date, 1));
        const prevShift = employeeShifts.find(s => s.date === prevDateStr);
        if (prevShift?.type === 'AFTERNOON') {
            return { valid: false, reason: 'Cannot work Morning after Afternoon' };
        }
    }

    // 4. Max Streak
    // Look back MAX_CONSECUTIVE_DAYS days. If all worked, today must be OFF.
    let streak = 0;
    for (let i = 1; i <= MAX_CONSECUTIVE_DAYS + 1; i++) { // Check one extra day to be safe
        const d = getDateStr(subDays(date, i));
        if (employeeShifts.some(s => s.date === d)) {
            streak++;
        } else {
            break;
        }
    }
    if (streak >= MAX_CONSECUTIVE_DAYS) {
        return { valid: false, reason: `Max consecutive days (${MAX_CONSECUTIVE_DAYS}) reached` };
    }


    // 5. 8 Days Off in 28 Days
    const windowStart = subDays(date, 27);
    let daysWorkedInWindow = 0;
    const shifts = employeeShifts.filter(s => {
        const sDate = new Date(s.date);
        return sDate >= windowStart && sDate < date;
    });
    daysWorkedInWindow = shifts.length;

    if (daysWorkedInWindow + 1 > (28 - MIN_DAYS_OFF_28_DAYS)) { // +1 for today
        return { valid: false, reason: 'Must have 8 days off in 28-day cycle' };
    }

    // 6. Minimum 2 Consecutive Days Off
    // Logic: If Day-1 was OFF, check Day-2.
    // If Day-2 was WORK, then Day-1 is the FIRST day of a break.
    // Therefore, Day-0 (Today) MUST be OFF to ensuring min 2 days.
    const dMinus1 = getDateStr(subDays(date, 1));
    const dMinus2 = getDateStr(subDays(date, 2));

    const workedMinus1 = employeeShifts.some(s => s.date === dMinus1);
    const workedMinus2 = employeeShifts.some(s => s.date === dMinus2);

    if (!workedMinus1 && workedMinus2) {
        // Yesterday was OFF, Day before was WORK.
        // So yesterday was the start of a break.
        // Today must continue the break.
        return { valid: false, reason: 'Must have consecutive days off (Day 2 of break)' };
    }

    return { valid: true };
};

export const generateMonthSchedule = async (
    year: number,
    month: number, // 0-11
    staff: Employee[],
    history: Shift[]
): Promise<{ schedule: Shift[], debug: string[] }> => {
    const debugLog: string[] = [];
    const log = (msg: string) => {
        if (debugLog.length < 1000) debugLog.push(msg);
        else if (debugLog.length === 1000) debugLog.push('... Log truncated ...');
    };

    const startDate = startOfMonth(new Date(year, month));
    const endDate = endOfMonth(startDate);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const state = new ScheduleState(history);

    // [#CulOs-01] Greedy approach with IMPROVED sorting
    for (const day of days) {
        const dateStr = getDateStr(day);
        const coverage = getRequiredCoverage(day);
        // log(`Planning ${dateStr} (Req: ${coverage.morning} AM, ${coverage.afternoon} PM)`);

        // Sort Staff Priority
        // We want to prioritize people who CAN work and haven't worked too much, 
        // BUT also prioritize people who are 'at risk' of breaking constraints if they don't work? 
        // Actually, usually we prioritize those who have worked LESS recently to equalize.

        // Also: Fixed Role Constraints.

        const candidates = [...staff];

        // Random shuffle for fairness base
        candidates.sort(() => Math.random() - 0.5);

        // Sorting Logic:
        // 1. Availability/Rules (Soft check? No, hard rules handled in loop)
        // 2. Minimize consecutive working days (fairness)? 
        // 3. Minimize total hours?

        // Let's sort by: Days worked in last 7 days (Ascending) -> Give shift to rested people.
        candidates.sort((a, b) => {
            const shiftsA = state.getEmployeeShifts(a.id);
            const shiftsB = state.getEmployeeShifts(b.id);

            // Count recent shifts
            const recentA = shiftsA.filter(s => new Date(s.date) > subDays(day, 7)).length;
            const recentB = shiftsB.filter(s => new Date(s.date) > subDays(day, 7)).length;

            return recentA - recentB;
        });


        const assignedShifts: Shift[] = [];
        const morningSlots = coverage.morning;
        const afternoonSlots = coverage.afternoon;

        // Try to fill slots
        // MORNING
        // Priority for AM: Ramsey (COOK_MORNING) > Cooks > Head Chef
        const amCandidates = [...candidates].sort((a, b) => {
            // 1. Role Priority
            const roleScore = (r: Role) => {
                if (r === 'COOK_MORNING') return 2;
                if (r === 'COOK_ROTATING') return 1; // Good for AM
                if (r === 'HEAD_CHEF') return 0; // Backup
                return 0;
            };
            return roleScore(b.role) - roleScore(a.role);
        });

        let filledAM = 0;
        for (let i = 0; i < morningSlots; i++) {
            // Find best candidate
            let picked: Employee | null = null;
            for (const candidate of amCandidates) {
                if (assignedShifts.find(s => s.employeeId === candidate.id)) continue;

                const check = checkConstraints(candidate, day, 'MORNING', state);
                if (check.valid) {
                    picked = candidate;
                    break;
                }
            }

            if (picked) {
                const shift: Shift = { date: dateStr, employeeId: picked.id, type: 'MORNING' };
                assignedShifts.push(shift);
                state.addShift(shift);
                filledAM++;
            }
        }

        // AFTERNOON
        // Priority for PM: Cooks > Head Chef > Cook Morning (Never)
        const pmCandidates = [...candidates].sort((a, b) => {
            // 1. Role Priority
            const roleScore = (r: Role) => {
                if (r === 'COOK_ROTATING') return 2;
                if (r === 'HEAD_CHEF') return 1;
                if (r === 'COOK_MORNING') return -1; // Cannot work PM
                return 0;
            };
            return roleScore(b.role) - roleScore(a.role);
        });

        let filledPM = 0;
        for (let i = 0; i < afternoonSlots; i++) {
            let picked: Employee | null = null;
            for (const candidate of pmCandidates) {
                if (assignedShifts.find(s => s.employeeId === candidate.id)) continue;

                const check = checkConstraints(candidate, day, 'AFTERNOON', state);
                if (check.valid) {
                    picked = candidate;
                    break;
                }
            }

            if (picked) {
                const shift: Shift = { date: dateStr, employeeId: picked.id, type: 'AFTERNOON' };
                assignedShifts.push(shift);
                state.addShift(shift);
                filledPM++;
            }
        }

        if (filledAM < morningSlots || filledPM < afternoonSlots) {
            log(`[WARNING] Understaffed ${dateStr}: AM:${filledAM}/${morningSlots}, PM:${filledPM}/${afternoonSlots}`);
        }
    }

    const resultShifts: Shift[] = [];
    state.shifts.forEach((shiftsRaw, key) => {
        const d = new Date(key);
        if (d.getMonth() === month && d.getFullYear() === year) {
            resultShifts.push(...shiftsRaw);
        }
    });

    return { schedule: resultShifts, debug: debugLog };
};
