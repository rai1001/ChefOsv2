// Value Objects
export { Money } from './domain/value-objects/Money';
export { Unit, UnitType } from './domain/value-objects/Unit';
export { Quantity } from './domain/value-objects/Quantity';

// Entities
export * from './domain/entities/Ingredient';
export * from './domain/entities/Batch';
export * from './domain/entities/FichaTecnica';
export * from './domain/entities/PurchaseOrder';
export * from './domain/entities/Event';
export * from './domain/entities/ProductionTask';

// Repository Interfaces
export * from './domain/interfaces/repositories/IIngredientRepository';
export * from './domain/interfaces/repositories/IBatchRepository';
export * from './domain/interfaces/repositories/IFichaTecnicaRepository';
export * from './domain/interfaces/repositories/IPurchaseOrderRepository';
export * from './domain/interfaces/repositories/IProductionTaskRepository';

// Service Interfaces
export * from './domain/interfaces/services/IAIService';
export * from './domain/interfaces/services/IStorageService';
export * from './domain/interfaces/ITransactionManager';
export * from './domain/interfaces/repositories/RepositoryOptions';

// Use Cases
export * from './use-cases/inventory/AddBatchUseCase';
export * from './use-cases/inventory/ConsumeFIFOUseCase';
export * from './use-cases/inventory/CheckExpiryUseCase';
export * from './use-cases/inventory/AdjustStockUseCase';
