
import { describe, it, expect } from 'vitest';
import { convertUnit } from './units';

describe('Unit Conversion Utils', () => {
    it('should convert standard metric units', () => {
        expect(convertUnit(1, 'kg', 'g')).toBe(1000);
        expect(convertUnit(500, 'g', 'kg')).toBe(0.5);
        expect(convertUnit(1, 'L', 'ml')).toBe(1000);
    });

    it('should handle identity conversion', () => {
        expect(convertUnit(10, 'kg', 'kg')).toBe(10);
    });

    it('should use custom conversion factors', () => {
        const factors = { 'caja': 15, 'bolsa': 5 }; // Base unit assumed kg

        // 1 caja (15kg) -> kg
        expect(convertUnit(1, 'caja', 'kg', factors)).toBe(15);

        // 1 caja (15kg) -> g (15000g)
        expect(convertUnit(1, 'caja', 'g', factors)).toBe(15000);

        // 3 bolsas (15kg) -> caja (1)
        expect(convertUnit(3, 'bolsa', 'caja', factors)).toBe(1);
    });

    it('should fail gracefully for unknown units', () => {
        expect(convertUnit(10, 'foo', 'bar')).toBe(10);
    });
});
