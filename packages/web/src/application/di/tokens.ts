/**
 * Tokens de servicios para dependency injection
 */
export const TOKENS = {
  // Repositories
  INGREDIENT_REPOSITORY: 'IIngredientRepository',
  BATCH_REPOSITORY: 'IBatchRepository',
  FICHA_REPOSITORY: 'IFichaTecnicaRepository',
  PURCHASE_ORDER_REPOSITORY: 'IPurchaseOrderRepository',
  EVENT_REPOSITORY: 'IEventRepository',
  PRODUCTION_TASK_REPOSITORY: 'IProductionTaskRepository',

  // Services
  AI_SERVICE: 'IAIService',
  STORAGE_SERVICE: 'IStorageService',
  TRANSACTION_MANAGER: 'ITransactionManager',

  // Use Cases - Inventory
  ADD_BATCH_USE_CASE: 'AddBatchUseCase',
  CONSUME_FIFO_USE_CASE: 'ConsumeFIFOUseCase',
  CHECK_EXPIRY_USE_CASE: 'CheckExpiryUseCase',
  ADJUST_STOCK_USE_CASE: 'AdjustStockUseCase',

  // Use Cases - Events
  CREATE_EVENT_FROM_BEO_USE_CASE: 'CreateEventFromBEO',
  GENERATE_PURCHASE_ORDER_FROM_EVENT_USE_CASE: 'GeneratePurchaseOrderFromEvent',
  GENERATE_PRODUCTION_TASKS_FROM_EVENT_USE_CASE: 'GenerateProductionTasksFromEvent',
} as const;
