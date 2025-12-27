import type { PendingEvent } from '@/types';

// Mock data to simulate emails found
const MOCK_PENDING_EVENTS: PendingEvent[] = [
    {
        id: 'evt_1',
        source: 'EMAIL_GMAIL',
        sender: 'wedding-planner@bodas.com',
        subject: 'Propuesta Menú Boda Sofia y Marc',
        receivedAt: new Date().toISOString(),
        snippet: 'Hola, necesitamos presupuesto para una boda el próximo 15 de Mayo de 2026. Serían unos 150 invitados...',
        predictedTitle: 'Boda Sofia y Marc',
        predictedDate: '2026-05-15',
        predictedPax: 150,
        predictedMenuType: 'Boda',
        confidenceScore: 0.95,
        status: 'pending'
    },
    {
        id: 'evt_2',
        source: 'EMAIL_OUTLOOK',
        sender: 'director@techcorp.com',
        subject: 'Almuerzo de Empresa Diciembre',
        receivedAt: new Date().toISOString(),
        snippet: 'Confirmamos el evento para el equipo directivo. Necesitamos una mesa para 12 personas este viernes.',
        predictedTitle: 'Almuerzo TechCorp',
        predictedDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], // 3 days from now
        predictedPax: 12,
        predictedMenuType: 'Empresa',
        confidenceScore: 0.88,
        status: 'pending'
    }
];

export const integrationService = {
    // Simulate scanning emails
    scanEmailsForEvents: async (): Promise<PendingEvent[]> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(MOCK_PENDING_EVENTS);
            }, 2000);
        });
    },

    // Simulate pushing to an external calendar
    syncToCalendar: async (event: any, provider: 'google' | 'outlook'): Promise<boolean> => {
        console.log(`Syncing event ${event.name} to ${provider} calendar...`);
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(true);
            }, 1500);
        });
    }
};
