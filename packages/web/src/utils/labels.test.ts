import { describe, it, expect } from 'vitest';
import { getRoleLabel, getShiftLabel, roleLabels, shiftTypeLabels } from './labels';

describe('Labels Utils', () => {
    describe('getRoleLabel', () => {
        it('should return correct label for known roles', () => {
            expect(getRoleLabel('HEAD_CHEF')).toBe('Jefe Cocina');
            expect(getRoleLabel('COOK_MORNING')).toBe('Cocinero Mañanas');
        });

        it('should fall back to formatted role string for unknown roles', () => {
            expect(getRoleLabel('UNKNOWN_ROLE')).toBe('UNKNOWN ROLE');
        });
    });

    describe('getShiftLabel', () => {
        it('should return correct label for known shift types', () => {
            expect(getShiftLabel('MORNING')).toBe('Mañana');
            expect(getShiftLabel('OFF')).toBe('Libre');
        });

        it('should return original string for unknown shift types', () => {
            expect(getShiftLabel('NIGHT_SHIFT')).toBe('NIGHT_SHIFT');
        });
    });

    it('should have correct mappings', () => {
        expect(roleLabels['HEAD_CHEF']).toBeDefined();
        expect(shiftTypeLabels['MORNING']).toBeDefined();
    });
});
