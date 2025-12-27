import { Money } from '../value-objects/Money';

export type BCGType = 'star' | 'plowhorse' | 'puzzle' | 'dog';

export interface BCGStats {
  id: string;
  name: string;
  margin: Money;
  sales: number;
  type: BCGType;
  contribution: Money; // margin * sales
  costPercentage: number;
}

export interface MenuEngineeringResult {
  statistics: BCGStats[];
  averages: {
    margin: Money;
    popularity: number;
  };
  totals: {
    contribution: Money;
    volume: number;
  };
}
