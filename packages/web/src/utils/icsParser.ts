import type { Event, EventType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const parseICS = (icsContent: string): Partial<Event>[] => {
  const events: Partial<Event>[] = [];
  const lines = icsContent.split(/\r\n|\n|\r/);
  let currentEvent: Partial<Event> | null = null;
  let inEvent = false;

  // Helper to parse ICS date string (e.g., 20231225T140000Z or 20231225)
  // Simplified handling - assumes UTC or simple floating time for now
  const parseICSDate = (dateStr: string): string => {
    if (!dateStr) return '';
    // Extract YYYYMMDD part
    const match = /(\d{8})/.exec(dateStr);
    if (match && match[1]) {
      const d = match[1];
      return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    }
    return '';
  };

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      currentEvent = {
        id: uuidv4(),
        type: 'Otros' as EventType, // Default
        pax: 0,
        notes: 'Imported from ICS',
      };
    } else if (line.startsWith('END:VEVENT')) {
      if (currentEvent?.date && currentEvent.name) {
        events.push(currentEvent);
      }
      inEvent = false;
      currentEvent = null;
    } else if (inEvent && currentEvent) {
      if (line.startsWith('SUMMARY:')) {
        currentEvent.name = line.substring(8);
      } else if (line.startsWith('DTSTART')) {
        // Handle DTSTART;VALUE=DATE:2023... or DTSTART:2023...
        const parts = line.split(':');
        if (parts.length > 1 && parts[1]) {
          const dateVal = parts[1];
          currentEvent.date = parseICSDate(dateVal);
        }
      } else if (line.startsWith('DESCRIPTION:')) {
        // Handle potentially long descriptions or multiline?
        // For now assuming single line or simple format based on previous logic
        const desc = line.substring(12);
        currentEvent.notes = desc;

        // Try to infer PAX from description if present (e.g., "PAX: 50")
        const paxMatch = /PAX:\s*(\d+)/i.exec(desc);
        if (paxMatch && paxMatch[1]) {
          currentEvent.pax = parseInt(paxMatch[1], 10);
        }
      }
    }
  }

  return events;
};
