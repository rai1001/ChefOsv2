import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateCacheKey, getCachedResult, setCachedResult } from './intelligentCache';

// Mock Firebase
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDoc = vi.fn();

vi.mock('@/config/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  Timestamp: class {
    seconds: number;
    nanoseconds: number;
    constructor(seconds: number, nanoseconds: number) {
      this.seconds = seconds;
      this.nanoseconds = nanoseconds;
    }
    toDate() {
      return new Date(this.seconds * 1000);
    }
    static fromDate(date: Date) {
      return new this(date.getTime() / 1000, 0);
    }
  },
}));

describe('IntelligentCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateCacheKey', () => {
    it('should generate consistent hash for same input', async () => {
      const hash1 = await generateCacheKey('menuGenerator', { test: 1 });
      const hash2 = await generateCacheKey('menuGenerator', { test: 1 });
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different input', async () => {
      const hash1 = await generateCacheKey('menuGenerator', { test: 1 });
      const hash2 = await generateCacheKey('menuGenerator', { test: 2 });
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hash for different feature', async () => {
      const hash1 = await generateCacheKey('menuGenerator', { test: 1 });
      const hash2 = await generateCacheKey('invoiceScanner', { test: 1 });
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('getCachedResult', () => {
    it('should return null if forceRefresh is true', async () => {
      const result = await getCachedResult('some-key', true);
      expect(result).toBeNull();
      expect(mockGetDoc).not.toHaveBeenCalled();
    });

    it('should return null if doc does not exist', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });
      const result = await getCachedResult('some-key');
      expect(result).toBeNull();
    });

    it('should return null if cache is expired', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          expiresAt: pastDate,
          result: { foo: 'bar' },
        }),
      });

      const result = await getCachedResult('some-key');
      expect(result).toBeNull();
    });
  });
});
