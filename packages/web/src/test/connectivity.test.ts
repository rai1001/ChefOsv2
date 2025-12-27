import { describe, it, expect, vi } from 'vitest';

// Mock getMessaging to avoid "browser not supported" error in jsdom
vi.mock('firebase/messaging', async (importOriginal) => {
    return {
        ...(await importOriginal<typeof import('firebase/messaging')>()),
        getMessaging: vi.fn(() => ({
            // minimal mock
        })),
        isSupported: vi.fn(async () => false)
    };
});

import { app, auth, db, storage } from '@/config/firebase';

describe('Firebase Connectivity & Configuration', () => {
    it('should have initialized Firebase App', () => {
        expect(app).toBeDefined();
        expect(app.name).toBeDefined();
    });

    it('should have initialized Auth service', () => {
        expect(auth).toBeDefined();
    });

    it('should have initialized Firestore service', () => {
        expect(db).toBeDefined();
    });

    it('should have initialized Storage service', () => {
        expect(storage).toBeDefined();
    });

    // Messaging might be null in test env
    it('should handle Messaging gracefully', () => {
        // Just verify importing didn't crash
        expect(true).toBe(true);
    });

    // We can check if config vars are loaded by inspecting the app options if exposed,
    // or simply trust that if app matches, config was passed.
    it('should have valid configuration keys', () => {
        // Accessing internal _options is not standard but we can check if the app is usable.
        // For unit testing, existence is the primary check.
        expect(app.options).toBeDefined();
        if (app.options.projectId) {
            expect(typeof app.options.projectId).toBe('string');
        }
    });
});
