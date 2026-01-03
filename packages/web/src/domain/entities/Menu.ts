export type MenuType = 'weekly' | 'event' | 'carte';
export type MenuStatus = 'draft' | 'active' | 'historic';

export interface MenuItem {
  recipeId?: string; // Optional link to a Recipe
  name: string; // Display name (can be custom or snapshot of recipe name)
  description?: string;
  price?: number;
  tags?: string[];
  allergens?: string[];
}

export interface MenuSection {
  id: string;
  name: string; // e.g. "Starters", "Monday Lunch"
  items: MenuItem[];
}

export class Menu {
  constructor(
    public id: string,
    public name: string,
    public type: MenuType,
    public status: MenuStatus,
    public outletId: string,
    public sections: MenuSection[] = [],
    public startDate?: Date,
    public endDate?: Date,
    public description?: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}
}
