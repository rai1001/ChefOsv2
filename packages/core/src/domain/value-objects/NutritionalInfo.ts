export interface NutritionalValues {
  energyKcal: number;
  protein: number;
  carbohydrates: number;
  sugars: number;
  fat: number;
  saturatedFat: number;
  fiber: number;
  sodium: number;
}

export class NutritionalInfo {
  constructor(
    public readonly values: NutritionalValues,
    public readonly portionSize: number = 100, // standard 100g/100ml
    public readonly portionUnit: string = 'g'
  ) {}

  static create(
    values: NutritionalValues,
    portionSize?: number,
    portionUnit?: string
  ): NutritionalInfo {
    return new NutritionalInfo(values, portionSize, portionUnit);
  }

  static empty(): NutritionalInfo {
    return new NutritionalInfo({
      energyKcal: 0,
      protein: 0,
      carbohydrates: 0,
      sugars: 0,
      fat: 0,
      saturatedFat: 0,
      fiber: 0,
      sodium: 0,
    });
  }

  perPortion(amount: number): NutritionalValues {
    const factor = amount / this.portionSize;
    return {
      energyKcal: this.values.energyKcal * factor,
      protein: this.values.protein * factor,
      carbohydrates: this.values.carbohydrates * factor,
      sugars: this.values.sugars * factor,
      fat: this.values.fat * factor,
      saturatedFat: this.values.saturatedFat * factor,
      fiber: this.values.fiber * factor,
      sodium: this.values.sodium * factor,
    };
  }
}
