import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as functions from 'firebase-functions';
import { generateMenu } from '../generators/menuGenerator';

// Mock dependencies
vi.mock('firebase-functions', () => ({
    https: {
        onCall: (handler: any) => handler,
        HttpsError: class extends Error {
            code: string;
            constructor(code: string, message: string) {
                super(message);
                this.code = code;
            }
        }
    }
}));

const mockGenerateContent = vi.fn();
vi.mock('@google-cloud/vertexai', () => ({
    VertexAI: class {
        getGenerativeModel() {
            return {
                generateContent: mockGenerateContent
            };
        }
    }
}));

describe('menuGenerator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.GCLOUD_PROJECT = 'test-project';
    });

    it('should generate a menu successfully when inputs are valid', async () => {
        const mockResponseText = JSON.stringify({
            name: "Test Menu",
            description: "A test menu",
            dishes: []
        });

        mockGenerateContent.mockResolvedValue({
            response: {
                candidates: [{
                    content: {
                        parts: [{ text: mockResponseText }]
                    }
                }]
            }
        });

        const data = { eventType: 'Wedding', pax: 100 };
        const context = { auth: { uid: 'user123' } } as any;

        const result = await generateMenu(data, context);

        expect(result).toEqual(JSON.parse(mockResponseText));
        expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('should throw unauthenticated error if no user', async () => {
        const data = { eventType: 'Wedding', pax: 100 };
        const context = {} as any; // No auth

        await expect(generateMenu(data, context))
            .rejects
            .toThrow("Must be authenticated.");
    });

    it('should handle AI errors appropriately', async () => {
        mockGenerateContent.mockRejectedValue(new Error("AI unavailable"));

        const data = { eventType: 'Wedding', pax: 100 };
        const context = { auth: { uid: 'user123' } } as any;

        await expect(generateMenu(data, context))
            .rejects
            .toThrow("Menu generation failed");
    });
});
