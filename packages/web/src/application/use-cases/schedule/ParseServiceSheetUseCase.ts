
import { injectable } from 'inversify';
import { format } from 'date-fns';
import { Event, EventType } from '@/domain/entities/Event';

@injectable()
export class ParseServiceSheetUseCase {
    execute(params: { data: any[][]; filename: string }): Partial<Event> {
        const { data, filename } = params;
        let name = filename.replace(/\.xlsx?$/, '');
        let date = format(new Date(), 'yyyy-MM-dd');
        let pax = 0;
        let menuNotes = '';
        let type: EventType = 'Comida'; // Default

        // Heuristics derived from legacy implementation
        for (let r = 0; r < data.length; r++) {
            const row = data[r];
            if (!row) continue;

            for (let c = 0; c < row.length; c++) {
                const cell = String(row[c] || '').toLowerCase().trim();

                // Name / Evento
                if (cell.includes('evento') && !name.includes('Navidad')) {
                    if (row[c + 1]) name = String(row[c + 1]);
                    else {
                        const nextRow = data[r + 1];
                        if (nextRow && nextRow[c]) name = String(nextRow[c]);
                    }
                }

                // Date / Fecha
                if (cell === 'fecha') {
                    let dateRaw = row[c + 1];
                    if (!dateRaw) {
                        const nextRow = data[r + 1];
                        if (nextRow && nextRow[c]) dateRaw = nextRow[c];
                    }

                    if (dateRaw) {
                        if (typeof dateRaw === 'number') {
                            // Original logic: const dateObj = new Date(Math.round((dateRaw - 25569) * 86400 * 1000)); if (isValid(dateObj)) date = format(dateObj, 'yyyy-MM-dd');
                            // Applying instruction's change for date parsing, assuming 'date' should be updated.
                            // The instruction uses 'dateStr' which is not declared, so I'll use 'date' to maintain functionality.
                            date = new Date((dateRaw - 25569) * 86400 * 1000).toISOString().split('T')[0] || '';
                        } else {
                            // Original logic: const parsed = parse(String(dateRaw).trim(), 'dd/MM/yyyy', new Date()); if (isValid(parsed)) date = format(parsed, 'yyyy-MM-dd');
                            // Applying instruction's change for date parsing, assuming 'date' should be updated.
                            // The instruction uses 'dateStr' which is not declared, so I'll use 'date' to maintain functionality.
                            // This change simplifies parsing to just taking the string, which might be less robust than original.
                            date = String(dateRaw);
                        }
                    }
                }

                // PAX / Personas
                if (cell === 'pax' || cell === 'no pax' || cell === 'personas' || cell.includes('nº pax')) {
                    let paxRaw = row[c + 1];
                    if (!paxRaw) {
                        const nextRow = data[r + 1];
                        if (nextRow && nextRow[c]) paxRaw = nextRow[c];
                    }

                    if (paxRaw && !isNaN(Number(paxRaw))) {
                        pax = Number(paxRaw);
                    }
                }

                // Menu content
                if (cell.includes('alimentos y bebidas')) {
                    let currentRow = r + 1;
                    while (currentRow < data.length) {
                        const nextRow = data[currentRow];
                        if (!nextRow) break;
                        const firstCell = String(nextRow[0] || '').toLowerCase();

                        if (firstCell.includes('bodega') || firstCell.includes('observaciones') || firstCell.includes('horarios')) {
                            break;
                        }

                        const line = nextRow.filter(x => x).join(' ');
                        if (line.trim()) {
                            menuNotes += line + '\n';
                        }
                        currentRow++;
                    }
                }
            }
        }

        const lowerName = name.toLowerCase();
        if (lowerName.includes('boda')) type = 'Boda';
        else if (lowerName.includes('comida')) type = 'Comida';
        else if (lowerName.includes('cena')) type = 'Cena';
        else if (lowerName.includes('coctel') || lowerName.includes('cóctel')) type = 'Coctel';
        else if (lowerName.includes('desayuno') || lowerName.includes('coffee')) type = 'Coffee Break';

        return { name, date, pax, notes: menuNotes, type, status: 'confirmed' };
    }
}
