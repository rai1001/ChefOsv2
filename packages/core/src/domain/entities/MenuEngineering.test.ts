import { describe, it, expect } from 'vitest';
import { MenuEngineeringResult, BCGStats } from './MenuEngineering';
import { Money } from '../value-objects/Money';

describe('MenuEngineering Entity', () => {
  it('should conform to the expected structure for BCG stats', () => {
    const stats: BCGStats = {
      id: '1',
      name: 'Star Recipe',
      margin: Money.fromCents(1000),
      sales: 50,
      type: 'star',
      contribution: Money.fromCents(50000),
      costPercentage: 30,
    };

    expect(stats.type).toBe('star');
    expect(stats.margin.centsValue).toBe(1000);
  });

  it('should conform to the expected structure for MenuEngineeringResult', () => {
    const result: MenuEngineeringResult = {
      statistics: [],
      averages: {
        margin: Money.fromCents(500),
        popularity: 10,
      },
      totals: {
        contribution: Money.fromCents(0),
        volume: 0,
      },
    };

    expect(result.averages.popularity).toBe(10);
    expect(result.totals.volume).toBe(0);
  });
});
