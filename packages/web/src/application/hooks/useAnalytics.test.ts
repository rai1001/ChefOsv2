import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAnalytics } from './useAnalytics';
import { container } from '../di/Container';
import { TYPES } from '../di/types';
import { Money } from '@culinaryos/core';

// Mock the DI container
vi.mock('../di/Container', () => ({
  container: {
    get: vi.fn(),
  },
}));

describe('useAnalytics hook', () => {
  let mockUseCase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCase = {
      execute: vi.fn(),
    };
    vi.mocked(container.get).mockReturnValue(mockUseCase);
  });

  it('should fetch and map analytics data on mount', async () => {
    const mockCoreResult = {
      statistics: [
        {
          id: '1',
          name: 'Recipe 1',
          margin: Money.fromCents(1000),
          sales: 50,
          type: 'star',
          contribution: Money.fromCents(50000),
        },
      ],
      averages: {
        margin: Money.fromCents(800),
        popularity: 40,
      },
      totals: {
        contribution: Money.fromCents(50000),
        volume: 50,
      },
    };

    mockUseCase.execute.mockResolvedValue(mockCoreResult);

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.statistics[0].margin).toBe(10); // Mapped from cents (1000 cents = 10)
    expect(result.current.data?.averages.margin).toBe(8);
    expect(result.current.error).toBe(null);
  });

  it('should handle errors during fetching', async () => {
    const error = new Error('Fetch failed');
    mockUseCase.execute.mockRejectedValue(error);

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(error);
  });

  it('should allow refreshing data', async () => {
    mockUseCase.execute.mockResolvedValue({
      statistics: [],
      averages: { margin: Money.fromCents(0), popularity: 0 },
      totals: { contribution: Money.fromCents(0), volume: 0 },
    });

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => expect(result.current.loading).toBe(false));

    mockUseCase.execute.mockResolvedValue({
      statistics: [
        {
          id: '2',
          name: 'New',
          margin: Money.fromCents(200),
          sales: 1,
          type: 'dog',
          contribution: Money.fromCents(200),
        },
      ],
      averages: { margin: Money.fromCents(200), popularity: 1 },
      totals: { contribution: Money.fromCents(200), volume: 1 },
    });

    result.current.refresh();

    await waitFor(() => expect(result.current.data?.statistics).toHaveLength(1));
  });
});
