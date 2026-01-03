// Collection Names
export const COLLECTION_NAMES = {
  INGREDIENTS: 'ingredients',
  RECIPES: 'recipes',
  MENUS: 'menus',
  EVENTS: 'events',
  STAFF: 'staff',
  SUPPLIERS: 'suppliers',
  PURCHASE_ORDERS: 'purchaseOrders',
  WASTE_RECORDS: 'wasteRecords',
  SCHEDULE: 'schedule',
  PCCS: 'pccs',
  HACCP_LOGS: 'haccpLogs',
  HACCP_TASKS: 'haccpTasks',
  HACCP_TASK_COMPLETIONS: 'haccpTaskCompletions',
  PRODUCTION_TASKS: 'productionTasks',
  OUTLETS: 'outlets',
  BATCHES: 'batches',
  FICHAS_TECNICAS: 'fichasTecnicas',
  VERSIONES_FICHAS: 'versionesFichas',
  INVENTORY: 'inventory',
  STOCK_MOVEMENTS: 'stockMovements',
  INGREDIENT_PRICE_HISTORY: 'ingredientPriceHistory',
  NOTIFICATIONS: 'notifications',
  SOCIAL_MANAGER_POSTS: 'socialManagerPosts',
} as const;

// Helper to get collection name only (removed live collection refs)
export const COLLECTIONS = COLLECTION_NAMES;
