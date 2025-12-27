import { v4 as uuidv4 } from 'uuid';
import type { Ingredient, Recipe, Menu, Event } from '@/types';

export const getSampleData = (): {
  ingredients: Ingredient[];
  recipes: Recipe[];
  menus: Menu[];
  events: Event[];
  suppliers: any[];
} => {
  // 0. Suppliers
  const supplierVegetablesId = uuidv4();
  const supplierMeatId = uuidv4();
  const supplierDryId = uuidv4();

  const suppliers: any[] = [
    // using any temporarily to avoid circular deps if needed, but typed better in real app
    {
      id: supplierVegetablesId,
      name: 'Fresh Veggies Co.',
      contactName: 'Juan Perez',
      email: 'juan@veggies.com',
      phone: '555-0101',
      leadTime: 1,
      orderDays: [1, 3, 5],
    },
    {
      id: supplierMeatId,
      name: 'Prime Meats Ltd.',
      contactName: 'Maria Garcia',
      email: 'maria@meat.com',
      phone: '555-0102',
      leadTime: 2,
      orderDays: [2, 4],
    },
    {
      id: supplierDryId,
      name: 'Global Foods',
      contactName: 'Carlos Ruiz',
      email: 'carlos@global.com',
      phone: '555-0103',
      leadTime: 3,
      orderDays: [1],
    },
  ];

  // 1. Ingredients
  const beefId = uuidv4();
  const bunId = uuidv4();
  const lettuceId = uuidv4();
  const tomatoId = uuidv4();
  const cheeseId = uuidv4();
  const potatoId = uuidv4();

  const ingredients = [
    {
      id: beefId,
      name: 'Ground Beef',
      unit: 'kg',
      costPerUnit: 12.5,
      yield: 1,
      allergens: [],
      stock: 5,
      minStock: 2,
      supplierId: supplierMeatId,
    },
    {
      id: bunId,
      name: 'Burger Bun',
      unit: 'un',
      costPerUnit: 0.5,
      yield: 1,
      allergens: ['Gluten', 'Sesame'],
      stock: 100,
      minStock: 20,
      supplierId: supplierDryId,
    },
    {
      id: lettuceId,
      name: 'Lettuce',
      unit: 'kg',
      costPerUnit: 2.0,
      yield: 0.85,
      allergens: [],
      stock: 2,
      minStock: 1,
      supplierId: supplierVegetablesId,
    },
    {
      id: tomatoId,
      name: 'Tomato',
      unit: 'kg',
      costPerUnit: 3.5,
      yield: 0.9,
      allergens: [],
      stock: 3,
      minStock: 1,
      supplierId: supplierVegetablesId,
    },
    {
      id: cheeseId,
      name: 'Cheddar Cheese',
      unit: 'kg',
      costPerUnit: 15.0,
      yield: 1,
      allergens: ['Dairy'],
      stock: 4,
      minStock: 1,
      supplierId: supplierDryId,
    },
    {
      id: potatoId,
      name: 'Potatoes',
      unit: 'kg',
      costPerUnit: 1.2,
      yield: 0.8,
      allergens: [],
      stock: 20,
      minStock: 5,
      supplierId: supplierVegetablesId,
    },
  ] as any;

  // 2. Recipes
  const burgerId = uuidv4();
  const friesId = uuidv4();
  const saladId = uuidv4();

  const recipes: Recipe[] = [
    {
      id: burgerId,
      name: 'Classic Cheeseburger',
      station: 'hot',
      ingredients: [
        { ingredientId: beefId, ingredient: ingredients[0], quantity: 0.15 }, // 150g beef
        { ingredientId: bunId, ingredient: ingredients[1], quantity: 1 }, // 1 bun
        { ingredientId: cheeseId, ingredient: ingredients[4], quantity: 0.02 }, // 20g cheese
        { ingredientId: lettuceId, ingredient: ingredients[2], quantity: 0.03 }, // 30g lettuce
        { ingredientId: tomatoId, ingredient: ingredients[3], quantity: 0.04 }, // 40g tomato
      ],
      totalCost: 0, // Will be calculated by app or we can pre-calc: 0.15*12.5 + 0.5 + 0.02*15 + ...
    },
    {
      id: friesId,
      name: 'French Fries Portion',
      station: 'hot', // assuming fryer or hot
      ingredients: [
        { ingredientId: potatoId, ingredient: ingredients[5], quantity: 0.3 }, // 300g potatoes
      ],
      totalCost: 0,
    },
    {
      id: saladId,
      name: 'Caesar Salad',
      station: 'cold',
      ingredients: [
        { ingredientId: lettuceId, ingredient: ingredients[2], quantity: 0.15 }, // 150g lettuce
        { ingredientId: cheeseId, ingredient: ingredients[4], quantity: 0.03 }, // 30g cheese
      ],
      totalCost: 0,
    },
  ];

  // 3. Menus
  const menuId = uuidv4();
  const menus: Menu[] = [
    {
      id: menuId,
      name: 'Burger Menu',
      recipeIds: [burgerId, friesId, saladId],
      recipes: recipes,
      sellPrice: 15.0,
    },
  ];

  // 4. Events
  const events: any[] = [
    // using any temporarily to avoid circular deps or complex type imports if not imported
    {
      id: uuidv4(),
      name: 'Corporate Lunch',
      date: new Date().toISOString().split('T')[0], // Today
      pax: 45,
      type: 'Comida',
      menuId: menuId,
      menu: menus[0],
    },
    {
      id: uuidv4(),
      name: 'Wedding Cocktail',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      pax: 120,
      type: 'Coctel',
      menuId: menuId,
      menu: menus[0],
    },
  ];

  return { ingredients: ingredients as unknown as Ingredient[], recipes, menus, events, suppliers };
};
