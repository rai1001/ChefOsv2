/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { parsePlaningMatrix } from './planingParser';

describe('PlaningParser', () => {
    const mockYear = 2024;

    it('should detect months and rooms in the same row', () => {
        const data = [
            ['MARZO', 'ROSALIA', 'PONDAL', 'CASTELAO'],
            ['1', 'EVENTO 1 20 PAX', '', 'EVENTO 2'],
            ['2', '', 'BODA 100 PAX', '']
        ];

        const events = parsePlaningMatrix(data, mockYear);

        expect(events).toHaveLength(3);

        // Check Event 1
        expect(events[0]).toMatchObject({
            name: 'EVENTO 1',
            date: '2024-03-01',
            pax: 20,
            room: 'ROSALIA'
        });

        // Check Event 2
        expect(events[1]).toMatchObject({
            name: 'EVENTO 2',
            date: '2024-03-01',
            room: 'CASTELAO'
        });

        // Check Event 3
        expect(events[2]).toMatchObject({
            name: 'BODA',
            date: '2024-03-02',
            pax: 100,
            type: 'Boda',
            room: 'PONDAL'
        });
    });

    it('should handle complex strings with heuristics', () => {
        const data = [
            ['ENERO', 'SALON A'],
            ['10', 'NATO/20 PAX MJ x tarde'],
            ['11', 'COCKTAIL CICCP 50 PAX/14:00 HRS.'],
            ['12', 'COMIDA GRUPO EMPRESA 30 PAX']
        ];

        const events = parsePlaningMatrix(data, mockYear);

        expect(events[0].name).toBe('NATO');
        expect(events[0].pax).toBe(20);
        expect(events[0].type).toBe('Comida'); // MJ triggers Comida

        expect(events[1].name).toBe('COCKTAIL CICCP');
        expect(events[1].pax).toBe(50);
        expect(events[1].type).toBe('Coctel');

        expect(events[2].name).toBe('COMIDA GRUPO EMPRESA');
        expect(events[2].pax).toBe(30);
        expect(events[2].type).toBe('Comida');
    });

    it('should ignore noise and empty cells', () => {
        const data = [
            ['MARZO', 'SALA'],
            ['', 'Oculto'],
            ['Day', 'Header'],
            ['1', ' '],
            ['2', 'OK'] // Too short usually ignored if < 3 chars
        ];

        const events = parsePlaningMatrix(data, mockYear);
        expect(events).toHaveLength(0); // "OK" is length 2, parser ignores length <= 2 currently
    });
});
