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
 * Format: Months in Column A, Rooms in subsequent columns of the same row.
 * Days (1-31) in Column A below the month marker.
 */
export const parsePlaningMatrix = (
  data: (string | number | undefined)[][],
  year: number = new Date().getFullYear(),
  sheetName = ''
): PlaningEvent[] => {
  const events: PlaningEvent[] = [];
  let currentMonthIndex = -1;
  let currentYear = year; // Default to passed year (selector)

  // 0. Detect Year from Sheet Name (e.g. "ENERO 26", "FEB 2026", "2025")
  if (sheetName) {
    const sheetYearMatch = /20\d{2}/.exec(sheetName) || /'?\d{2}$/.exec(sheetName); // Match 2026 or '26 or 26 at end
    if (sheetYearMatch) {
      const rawYear = sheetYearMatch[0].replace("'", '');
      const detectedTotal = rawYear.length === 2 ? 2000 + parseInt(rawYear) : parseInt(rawYear);

      // Heuristic: If detecting 2025/2026/2027 etc.
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

    // 1. Detect Month Header and Room Mapping
    const firstCell = String(row[0] || '')
      .toUpperCase()
      .trim();

    // Check if ANY month name is in the string, e.g. "ENERO 2026" or just "ENERO"
    const foundMonth = MONTHS.find((m) => firstCell.includes(m));

    if (foundMonth) {
      currentMonthIndex = MONTHS.indexOf(foundMonth);

      // Try to extract year: "ENERO 2026" -> 2026
      // Matches 4 digits starting with 20
      const yearMatch = /20\d{2}/.exec(firstCell);
      if (yearMatch) {
        currentYear = parseInt(yearMatch[0]);
      } else {
        // Reset to default if no year found? Or keep previous?
        // Better to keep previous if we assume chronological order,
        // OR reset to default if we assume each sheet might be different.
        // Let's assume inheritance or default.
        // currentYear = year;
      }

      // Rooms are usually in the same row starting from column B
      rooms = [];
      roomColumns = [];
      for (let c = 1; c < row.length; c++) {
        const roomName = String(row[c] || '').trim();
        // Filter out the month name itself if it appears in cols? Unlikely but safe.
        if (roomName && !MONTHS.includes(roomName.toUpperCase())) {
          rooms.push(roomName);
          roomColumns.push(c);
        }
      }
      continue;
    }

    // 2. Process Day Rows (where column A is a number 1-31)
    if (
      currentMonthIndex !== -1 &&
      !isNaN(Number(row[0])) &&
      Number(row[0]) > 0 &&
      Number(row[0]) <= 31
    ) {
      const day = Number(row[0]);

      // Build date string YYYY-MM-DD
      const dateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Iterate through identified room columns
      roomColumns.forEach((colIdx, idx) => {
        const cellValue = row[colIdx];
        if (!cellValue) return;

        const cellContent = String(cellValue).trim();
        // Ignore headers repeated or very short noise
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

  return events;
};

/**
 * Extracts event name, PAX, and Type from a cell string using heuristics.
 * Example strings:
 * - "NATO/20 PAX MJ x tarde"
 * - "COCKTAIL CICCP 50 PAX/14:00 HRS."
 */
const extractEventDetails = (text: string): { name: string; pax: number; type: EventType } => {
  let name = text;
  let pax = 0;
  let type: EventType = 'Otros';

  // Extract PAX (e.g., "20 PAX", "50PAX", "20/PAX")
  const paxMatch = /(\d+)\s*\/?\s*PAX/i.exec(text);
  if (paxMatch && paxMatch[1]) {
    pax = parseInt(paxMatch[1]);
    // Remove the PAX part to clean the name
    name = name.replace(paxMatch[0], '').trim();
  }

  // Extact Type based on keywords
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

  // Clean up the name string
  // Remove slash-appended tags like "/14:00" or "/tarde"
  name = (name.split('/')[0] || '').split('(')[0]?.trim() || '';

  // Final sanitation
  name = name.replace(/\s+/g, ' ').trim();
  if (!name || name.length < 2) name = 'Evento Sin Nombre';
  if (name.length > 60) name = name.substring(0, 57) + '...';

  return { name, pax, type };
};
