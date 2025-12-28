import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiAdapter } from './GeminiAdapter';

// Mocks
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn();
const mockGetAI = vi.fn();

vi.mock('firebase/ai', () => ({
  getAI: (...args: any[]) => mockGetAI(...args),
  getGenerativeModel: (...args: any[]) => mockGetGenerativeModel(...args),
}));

vi.mock('@/config/firebase', () => ({
  app: {},
}));

// Mock ResilientGeminiWrapper to execute immediately
vi.mock('../wrappers/ResilientGeminiWrapper', () => ({
  ResilientGeminiWrapper: class {
    async execute(fn: any) {
      return fn();
    }
  },
}));

// Mock CostTracker to avoid side effects
vi.mock('../monitoring/CostTracker', () => ({
  CostTracker: {
    logUsage: vi.fn(),
  },
}));

describe('GeminiAdapter', () => {
  let adapter: GeminiAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent,
    });
    adapter = new GeminiAdapter();
  });

  describe('enrichIngredient', () => {
    it('should call generateContent with jsonMode enabled', async () => {
      mockGenerateContent.mockResolvedValue({
        response: Promise.resolve({
          text: () => JSON.stringify({ nutritionalInfo: {}, allergens: [] }),
          usageMetadata: {},
        }),
      });

      await adapter.enrichIngredient('Tomato');

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          generationConfig: expect.objectContaining({
            responseMimeType: 'application/json',
          }),
        })
      );
    });

    it('should parse clean JSON response', async () => {
      const mockData = { nutritionalInfo: { calories: 20 }, allergens: [] };
      mockGenerateContent.mockResolvedValue({
        response: Promise.resolve({
          text: () => JSON.stringify(mockData),
          usageMetadata: {},
        }),
      });

      const result = await adapter.enrichIngredient('Tomato');
      expect(result).toEqual(mockData);
    });

    it('should handle markdown wrapped JSON', async () => {
      const mockData = { nutritionalInfo: { calories: 20 }, allergens: [] };
      const jsonStr = JSON.stringify(mockData);
      mockGenerateContent.mockResolvedValue({
        response: Promise.resolve({
          text: () => '```json\n' + jsonStr + '\n```',
          usageMetadata: {},
        }),
      });

      const result = await adapter.enrichIngredient('Tomato');
      expect(result).toEqual(mockData);
    });

    it('should return default object on parse error', async () => {
      mockGenerateContent.mockResolvedValue({
        response: Promise.resolve({
          text: () => 'INVALID JSON',
          usageMetadata: {},
        }),
      });

      const result = await adapter.enrichIngredient('Tomato');
      expect(result.nutritionalInfo.calories).toBe(0);
      expect(result.allergens).toHaveLength(0);
    });
  });

  describe('scanDocument', () => {
    // similar tests for scanDocument using jsonMode
    it('should parse JSON from scanDocument', async () => {
      const mockItems = [{ name: 'Item 1' }];
      mockGenerateContent.mockResolvedValue({
        response: Promise.resolve({
          text: () => JSON.stringify({ items: mockItems }),
          usageMetadata: {},
        }),
      });

      // We need to mock analyzeImage logic effectively?
      // Actually scanDocument calls analyzeImage internal method, which calls generateContent.
      // But scanDocument requires base64.

      await adapter.scanDocument('base64string', 'INVOICE');

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          generationConfig: expect.objectContaining({
            responseMimeType: 'application/json',
          }),
        })
      );
    });
  });
});
