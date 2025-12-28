import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks MUST be defined before imports
const mockGenerateContent = vi.fn();
const mockOnCall = vi.fn((handler) => handler); // Pass through handler

vi.mock('firebase-functions/v2/https', () => ({
  onCall: (handler: any) => handler, // The function becomes the handler directly
  HttpsError: class extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock('@google-cloud/vertexai', () => ({
  VertexAI: class {
    getGenerativeModel() {
      return {
        generateContent: mockGenerateContent,
      };
    }
  },
}));

// Import AFTER mocks
import { generateMenu } from '../generators/menuGenerator';

describe('menuGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GCLOUD_PROJECT = 'test-project';
  });

  it('should generate a menu successfully when inputs are valid', async () => {
    const mockResponseText = JSON.stringify({
      name: 'Test Menu',
      description: 'A test menu',
      dishes: [],
    });

    mockGenerateContent.mockResolvedValue({
      response: {
        candidates: [
          {
            content: {
              parts: [{ text: mockResponseText }],
            },
          },
        ],
      },
    });

    const data = { eventType: 'Wedding', pax: 100 };
    // In v2, onCall handler receives a "request" object with .data and .auth
    const request = {
      data,
      auth: { uid: 'user123' },
    } as any;

    // generateMenu is now the raw handler function due to the mock
    const result = await (generateMenu as any)(request);

    expect(result).toEqual(JSON.parse(mockResponseText));
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it('should throw unauthenticated error if no user', async () => {
    const data = { eventType: 'Wedding', pax: 100 };
    const request = { data, auth: null } as any;

    await expect((generateMenu as any)(request)).rejects.toThrow('Must be authenticated.');
  });

  it('should handle AI errors appropriately', async () => {
    mockGenerateContent.mockRejectedValue(new Error('AI unavailable'));

    const data = { eventType: 'Wedding', pax: 100 };
    const request = {
      data,
      auth: { uid: 'user123' },
    } as any;

    await expect((generateMenu as any)(request)).rejects.toThrow('Menu generation failed');
  });
});
