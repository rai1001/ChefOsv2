export type BCGType = 'star' | 'plowhorse' | 'puzzle' | 'dog';

export interface BCGStats {
    id: string;
    name: string;
    margin: number;
    sales: number;
    type: BCGType;
    contribution: number; // margin * sales
}

export interface MenuEngineeringResult {
    statistics: BCGStats[];
    averages: {
        margin: number;
        popularity: number;
    };
    totals: {
        contribution: number;
        volume: number;
    };
}
