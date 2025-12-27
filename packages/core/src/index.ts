// Value Objects
export { Money } from './domain/value-objects/Money';
export { Unit, UnitType } from './domain/value-objects/Unit';
export { Quantity } from './domain/value-objects/Quantity';
export { NutritionalInfo, type NutritionalValues } from './domain/value-objects/NutritionalInfo';

// Entities
export * from './domain/entities/Ingredient';
export * from './domain/entities/Batch';
export * from './domain/entities/FichaTecnica';
export * from './domain/entities/ProductionTask';
export * from './domain/entities/PurchaseOrder';
export * from './domain/entities/Event';
export * from './domain/entities/StockTransaction';

// Repository Interfaces
export * from './infrastructure/repositories/IIngredientRepository';
export * from './infrastructure/repositories/IBatchRepository';
export * from './infrastructure/repositories/IFichaTecnicaRepository';
export * from './infrastructure/repositories/IPurchaseOrderRepository';
export * from './infrastructure/repositories/IProductionTaskRepository';
export * from './infrastructure/repositories/IStockTransactionRepository';

// Service Interfaces
export * from './infrastructure/services/IAIService';
export * from './infrastructure/services/IStorageService';
export * from './infrastructure/ITransactionManager';
export * from './infrastructure/repositories/RepositoryOptions';

// Use Cases
export * from './application/inventory/AddBatchUseCase';
export * from './application/inventory/ConsumeFIFOUseCase';
export * from './application/inventory/CheckExpiryUseCase';
export * from './application/inventory/AdjustStockUseCase';
export * from './application/inventory/PerformAuditUseCase';
export * from './application/inventory/ProcessStockMovementUseCase';
export * from './application/fichas/GetFichasTecnicasUseCase';
export * from './application/fichas/CreateFichaTecnicaUseCase';
export * from './application/fichas/UpdateFichaTecnicaUseCase';
export * from './application/fichas/DeleteFichaTecnicaUseCase';
export * from './application/fichas/CalculateFichaCostUseCase';
export * from './application/inventory/GetIngredientsUseCase';
export * from './application/inventory/CreateIngredientUseCase';
export * from './application/inventory/UpdateIngredientUseCase';
export * from './application/inventory/DeleteIngredientUseCase';
export * from './application/inventory/GetInventoryStatusUseCase';

// Purchases
export * from './application/purchases/CreatePurchaseOrderUseCase';
export * from './application/purchases/ApprovePurchaseOrderUseCase';
export * from './application/purchases/ReceivePurchaseOrderUseCase';
export * from './application/purchases/UpdatePurchaseOrderUseCase';
export * from './application/purchases/CancelPurchaseOrderUseCase';
export * from './application/purchases/GetPurchaseOrdersUseCase';

// Production
export * from './application/production/CreateProductionTaskUseCase';
export * from './application/production/UpdateTaskStatusUseCase';
export * from './application/production/AssignTaskUseCase';
export * from './application/production/ScheduleProductionUseCase';
export * from './application/production/CompleteTaskUseCase';
export * from './application/production/GetProductionTasksUseCase';

// Events
export * from './application/events/CreateEventUseCase';
export * from './application/events/UpdateEventUseCase';
export * from './application/events/DeleteEventUseCase';
export * from './application/events/GetEventsUseCase';

// Versioning
export * from './application/fichas/CreateFichaTecnicaVersionUseCase';
export * from './application/fichas/GetFichaTecnicaVersionsUseCase';
export * from './application/fichas/GetIngredientUsageHistoryUseCase';

// HACCP
export * from './application/haccp/CreateHACCPLogUseCase';
export * from './application/haccp/GetHACCPLogsUseCase';
export * from './application/haccp/GetDailyHACCPTasksUseCase';

// Analytics
export * from './domain/entities/MenuEngineering';
export * from './application/analytics/CalculateBCGMatrixUseCase';
export * from './application/analytics/GenerateProfitabilityReportUseCase';
