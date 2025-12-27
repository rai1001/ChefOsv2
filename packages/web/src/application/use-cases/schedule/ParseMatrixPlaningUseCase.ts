
import { injectable } from 'inversify';
import { Event, EventType } from '@/domain/entities/Event';

@injectable()
export class ParseMatrixPlaningUseCase {
    private MONTHS = [
        'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
        'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];

    execute(params: { data: any[][]; year: number; sheetName?: string }): Event[] {
        const { data, year, sheetName } = params;
        const events: Event[] = [];
        let currentMonthIndex = -1;
        let currentYear = this.detectYear(sheetName, year);

        let rooms: string[] = [];
        let roomColumns: number[] = [];

        for (let r = 0; r < data.length; r++) {
            const row = data[r];
            if (!row || row.length === 0) continue;

            const firstCell = String(row[0] || '').toUpperCase().trim();
            const foundMonth = this.MONTHS.find(m => firstCell.includes(m));

            if (foundMonth) {
                currentMonthIndex = this.MONTHS.indexOf(foundMonth);
                const yearMatch = /20\d{2}/.exec(firstCell);
                if (yearMatch) currentYear = parseInt(yearMatch[0]);

                rooms = [];
                roomColumns = [];
                for (let c = 1; c < row.length; c++) {
                    const roomName = String(row[c] || '').trim();
                    if (roomName && !this.MONTHS.includes(roomName.toUpperCase())) {
                        rooms.push(roomName);
                        roomColumns.push(c);
                    }
                }
                continue;
            }

            if (currentMonthIndex !== -1 && !isNaN(Number(row[0])) && Number(row[0]) > 0 && Number(row[0]) <= 31) {
                const day = Number(row[0]);
                const dateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                roomColumns.forEach((colIdx, idx) => {
                    const cellValue = row[colIdx];
                    if (!cellValue) return;

                    const cellContent = String(cellValue).trim();
                    if (cellContent && cellContent.length > 2 && !rooms.includes(cellContent)) {
                        const { name, pax, type } = this.extractEventDetails(cellContent);
                        const roomName = rooms[idx] || 'Sin Sala';
                        events.push({
                            id: crypto.randomUUID(),
                            name,
                            date: dateStr,
                            pax,
                            type,
                            room: roomName,
                            notes: `Sala: ${roomName}\nOriginal: ${cellContent}`,
                            status: 'confirmed'
                        });
                    }
                });
            }
        }
        return events;
    }

    private detectYear(sheetName: string | undefined, defaultYear: number): number {
        if (!sheetName) return defaultYear;
        const match = (/20\d{2}/.exec(sheetName)) || (/'?\d{2}$/.exec(sheetName));
        if (!match) return defaultYear;
        const raw = match[0].replace("'", "");
        return raw.length === 2 ? 2000 + parseInt(raw) : parseInt(raw);
    }

    private extractEventDetails(text: string): { name: string; pax: number; type: EventType } {
        let name = text;
        let pax = 0;
        let type: EventType = 'Otros';

        const paxMatch = /(\d+)\s*\/?\s*PAX/i.exec(text);
        if (paxMatch && paxMatch[1]) {
            pax = parseInt(paxMatch[1]);
            name = name.replace(paxMatch[0], '').trim();
        }

        const lower = text.toLowerCase();
        if (lower.includes('boda')) type = 'Boda';
        else if (lower.includes('coctel') || lower.includes('cóctel')) type = 'Coctel';
        else if (lower.includes('break') || lower.includes('coffee')) type = 'Coffee Break';
        else if (lower.includes('almuerzo') || lower.includes('comida') || lower.includes('mj')) type = 'Comida';
        else if (lower.includes('cena') || lower.includes('noche') || lower.includes('tarde')) type = 'Cena';
        else if (lower.includes('empresa') || lower.includes('reunion') || lower.includes('reunión')) type = 'Empresa';
        else if (lower.includes('deportivo') || lower.includes('equipo')) type = 'Equipo Deportivo';

        const parts = name.split('/');
        const firstPart = parts[0] || '';
        name = firstPart.split('(')[0] || '';
        name = name.trim();
        if (!name || name.length < 2) name = "Evento Sin Nombre";
        return { name, pax, type };
    }
}
