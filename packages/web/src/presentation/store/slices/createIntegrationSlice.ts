import type { StateCreator } from 'zustand';
import type { AppState, IntegrationSlice, Integration } from '@/presentation/store/types';

export const createIntegrationSlice: StateCreator<
    AppState,
    [],
    [],
    IntegrationSlice
> = (set) => ({
    integrations: [
        {
            id: 'google-workspace',
            name: 'Google Workspace',
            provider: 'google',
            status: 'disconnected',
            description: 'Conecta tu cuenta de Google para sincronizar eventos con Calendar y escanear correos de Gmail.',
            features: ['Google Calendar Sync', 'Gmail Event Scan', 'Drive Access'],
        },
        {
            id: 'outlook-365',
            name: 'Microsoft Outlook',
            provider: 'microsoft',
            status: 'disconnected',
            description: 'Conecta tu cuenta de Outlook para escanear correos en busca de eventos de catering.',
            features: ['Outlook Email Scan', 'Outlook Calendar Sync'],
        },
        {
            id: 'google-gemini',
            name: 'Google Gemini AI',
            provider: 'google',
            status: 'disconnected',
            description: 'Potencia ChefOS con IA avanzada para creación de menús, escaneo de facturas y predicción de demanda.',
            features: ['AI Menu Generation', 'Smart Invoice Parsing', 'Demand Prediction'],
        }
    ],

    setIntegrations: (integrations: Integration[]) => set({ integrations }),

    connectIntegration: async (id: string) => {
        // Simulation of OAuth flow
        set((state) => ({
            integrations: state.integrations.map(int =>
                int.id === id ? { ...int, status: 'connected' as const, connectedAt: new Date().toISOString() } : int
            )
        }));
    },

    disconnectIntegration: async (id: string) => {
        set((state) => ({
            integrations: state.integrations.map(int =>
                int.id === id ? { ...int, status: 'disconnected' as const, connectedAt: undefined } : int
            )
        }));
    }
});
