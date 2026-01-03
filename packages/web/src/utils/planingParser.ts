import type { EventType } from '@/types';

export interface PlaningEvent {
  name: string;
  date: string;
  pax: number;
  type: EventType;
  room: string;
  notes: string;
}

const MONTHS = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

/**
 * [#CulOs-02] Parses a 2D array from an Excel sheet in "Planing Matrix" format.
 * Format: Months in any of the first few columns, Rooms in subsequent columns of the same row.
 * Days (1-31) in any of the first few columns below the month marker.
 */
export const parsePlaningMatrix = (
  data: (string | number | undefined)[][],
  year: number = new Date().getFullYear(),
  sheetName = ''
): PlaningEvent[] => {
  const events: PlaningEvent[] = [];
  let currentMonthIndex = -1;
  let currentYear = year;

  // 0. Detect Year from Sheet Name
  if (sheetName) {
    const sheetYearMatch = /20\d{2}/.exec(sheetName) || /'?\d{2}$/.exec(sheetName);
    if (sheetYearMatch) {
      const rawYear = sheetYearMatch[0].replace("'", '');
      const detectedTotal = rawYear.length === 2 ? 2000 + parseInt(rawYear) : parseInt(rawYear);
      if (detectedTotal >= 2024 && detectedTotal <= 2030) {
        currentYear = detectedTotal;
      }
    }
  }

  let rooms: string[] = [];
  let roomColumns: number[] = [];

  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    if (!row || row.length === 0) continue;

    // 1. Detect Month Header and Room Mapping (Search first 5 columns)
    let foundMonth = null;
    let monthColIndex = -1;

    for (let c = 0; c < Math.min(row.length, 5); c++) {
      const cellText = String(row[c] || '')
        .toUpperCase()
        .trim();
      const match = MONTHS.find((m) => cellText.includes(m));
      if (match) {
        foundMonth = match;
        monthColIndex = c;
        break;
      }
    }

    if (foundMonth) {
      currentMonthIndex = MONTHS.indexOf(foundMonth);
      const firstCellText = String(row[monthColIndex]);
      const yearMatch = /20\d{2}/.exec(firstCellText);
      if (yearMatch) {
        currentYear = parseInt(yearMatch[0]);
      }

      // Rooms typically follow the month name or start in subsequent columns
      rooms = [];
      roomColumns = [];
      for (let c = monthColIndex + 1; c < row.length; c++) {
        const roomName = String(row[c] || '').trim();
        if (roomName && !MONTHS.includes(roomName.toUpperCase()) && !/^\d+$/.test(roomName)) {
          rooms.push(roomName);
          roomColumns.push(c);
        }
      }
      continue;
    }

    // 2. Process Day Rows (Search first 5 columns for a number 1-31)
    if (currentMonthIndex !== -1) {
      let day = -1;

      for (let c = 0; c < Math.min(row.length, 5); c++) {
        const val = row[c];
        if (val !== undefined && val !== null && val !== '') {
          const num = Number(val);
          if (!isNaN(num) && num > 0 && num <= 31) {
            day = num;
            break;
          }
        }
      }

      if (day !== -1) {
        const dateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Rooms are indexed relative to roomColumns
        roomColumns.forEach((colIdx, idx) => {
          const cellValue = row[colIdx];
          if (!cellValue) return;

          const cellContent = String(cellValue).trim();
          // Heuristic: ignore short noise, headers repeated, or day numbers repeated in cells
          if (cellContent && cellContent.length > 2 && !rooms.includes(cellContent)) {
            const extracted = extractEventDetails(cellContent);
            events.push({
              ...extracted,
              date: dateStr,
              room: rooms[idx] || 'Desconocida',
              notes: `Sala: ${rooms[idx] || 'Desconocida'}\nOriginal: ${cellContent}`,
            });
          }
        });
      }
    }
  }

  return events;
};

const extractEventDetails = (text: string): { name: string; pax: number; type: EventType } => {
  let name = text;
  let pax = 0;
  let type: EventType = 'Otros';

  const paxMatch = /(\d+)\s*\/?\s*PAX/i.exec(text);
  if (paxMatch && paxMatch[1]) {
    pax = parseInt(paxMatch[1]);
    name = name.replace(paxMatch[0], '').trim();
  }

  const lowerText = text.toLowerCase();
  if (lowerText.includes('boda')) type = 'Boda';
  else if (
    lowerText.includes('coctel') ||
    lowerText.includes('cóctel') ||
    lowerText.includes('cocktail')
  )
    type = 'Coctel';
  else if (lowerText.includes('break') || lowerText.includes('coffee')) type = 'Coffee Break';
  else if (
    lowerText.includes('almuerzo') ||
    lowerText.includes('comida') ||
    lowerText.includes('mj')
  )
    type = 'Comida';
  else if (lowerText.includes('cena') || lowerText.includes('noche') || lowerText.includes('tarde'))
    type = 'Cena';
  else if (
    lowerText.includes('empresa') ||
    lowerText.includes('reunion') ||
    lowerText.includes('reunión')
  )
    type = 'Empresa';
  else if (lowerText.includes('deportivo') || lowerText.includes('equipo'))
    type = 'Equipo Deportivo';

  name = (name.split('/')[0] || '').split('(')[0]?.trim() || '';
  name = name.replace(/\s+/g, ' ').trim();
  if (!name || name.length < 2) name = 'Evento Sin Nombre';
  if (name.length > 60) name = name.substring(0, 57) + '...';

  return { name, pax, type };
};
