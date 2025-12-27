import { container } from './Container';
import { TYPES } from './types';
import { IAuthRepository } from '@/domain/interfaces/repositories/IAuthRepository';
import { FirebaseAuthRepository } from '@/infrastructure/repositories/FirebaseAuthRepository';
import { LoginUseCase } from '../use-cases/auth/LoginUseCase';
import { LoginWithEmailUseCase } from '../use-cases/auth/LoginWithEmailUseCase';

// Ingredients Module Imports
import { IIngredientRepository } from '@/domain/interfaces/repositories/IIngredientRepository';
import { FirebaseIngredientRepository } from '@/infrastructure/repositories/FirebaseIngredientRepository';
import { IAIService } from '@/domain/interfaces/services/IAIService';
import { GeminiAdapter } from '@/services/adapters/GeminiAdapter';
import { IImportService } from '@/domain/interfaces/services/IImportService';
import { ExcelImportService } from '@/infrastructure/services/ExcelImportService';
import { GetIngredientsUseCase } from '../use-cases/ingredients/GetIngredientsUseCase';
import { CreateIngredientUseCase } from '../use-cases/ingredients/CreateIngredientUseCase';
import { UpdateIngredientUseCase } from '../use-cases/ingredients/UpdateIngredientUseCase';
import { DeleteIngredientUseCase } from '../use-cases/ingredients/DeleteIngredientUseCase';
import { EnrichIngredientUseCase } from '../use-cases/ingredients/EnrichIngredientUseCase';
import { ScanDocumentUseCase } from '../use-cases/ingredients/ScanDocumentUseCase';
import { ImportIngredientsUseCase } from '../use-cases/ingredients/ImportIngredientsUseCase';
import { CoreIngredientRepositoryAdapter } from '@/adapters/repositories/CoreIngredientRepositoryAdapter';

import {
  CalculateFichaCostUseCase as CoreCalculateRecipeCostUseCase,
  IFichaTecnicaRepository as ICoreRecipeRepository,
  IIngredientRepository as ICoreIngredientRepository,
  IBatchRepository as ICoreBatchRepository,
  ITransactionManager,
  ProcessStockMovementUseCase as CoreProcessStockMovementUseCase,
  PerformAuditUseCase as CorePerformAuditUseCase,
  AdjustStockUseCase as CoreAdjustStockUseCase,
  AddBatchUseCase as CoreAddBatchUseCase,
  ConsumeFIFOUseCase as CoreConsumeFIFOUseCase,
  GetFichasTecnicasUseCase as CoreGetRecipesUseCase,
  CreateFichaTecnicaUseCase as CoreCreateRecipeUseCase,
  UpdateFichaTecnicaUseCase as CoreUpdateRecipeUseCase,
  DeleteFichaTecnicaUseCase as CoreDeleteRecipeUseCase,
  GetIngredientsUseCase as CoreGetIngredientsUseCase,
  CreateIngredientUseCase as CoreCreateIngredientUseCase,
  UpdateIngredientUseCase as CoreUpdateIngredientUseCase,
  DeleteIngredientUseCase as CoreDeleteIngredientUseCase,
  GetInventoryStatusUseCase as CoreGetInventoryStatusUseCase,
  IStockTransactionRepository as ICoreStockTransactionRepository,
  CalculateBCGMatrixUseCase,
  GenerateProfitabilityReportUseCase,
} from '@culinaryos/core';

import { IRecipeRepository } from '@/domain/interfaces/repositories/IRecipeRepository';
import { FirebaseRecipeRepository } from '@/infrastructure/repositories/FirebaseRecipeRepository';
import { CoreRecipeRepositoryAdapter } from '@/adapters/repositories/CoreRecipeRepositoryAdapter';
import { CalculateRecipeCostUseCase } from '../use-cases/recipes/CalculateRecipeCostUseCase';
import { GetRecipesUseCase } from '../use-cases/recipes/GetRecipesUseCase';
import { CreateRecipeUseCase } from '../use-cases/recipes/CreateRecipeUseCase';
import { UpdateRecipeUseCase } from '../use-cases/recipes/UpdateRecipeUseCase';
import { DeleteRecipeUseCase } from '../use-cases/recipes/DeleteRecipeUseCase';

import { IInventoryRepository } from '@/domain/repositories/IInventoryRepository';
import { FirebaseInventoryRepository } from '@/infrastructure/repositories/FirebaseInventoryRepository';
import { FirestoreBatchRepository } from '@/infrastructure/firebase/repositories/FirestoreBatchRepository';
import { FirestoreTransactionManager } from '@/infrastructure/firebase/repositories/FirestoreTransactionManager';
import { CoreStockTransactionRepositoryAdapter } from '@/adapters/repositories/CoreStockTransactionRepositoryAdapter';
import { RegisterStockMovementUseCase } from '../use-cases/inventory/RegisterStockMovementUseCase';
import { GetInventoryStatusUseCase } from '../use-cases/inventory/GetInventoryStatusUseCase';
import { PerformAuditUseCase } from '../use-cases/inventory/PerformAuditUseCase';

// Removed legacy CalculateBCGMatrixUseCase import

// Schedule & Events Module Imports
import { GenerateScheduleUseCase } from '../use-cases/schedule/GenerateScheduleUseCase';
import { ParseMatrixPlaningUseCase } from '../use-cases/schedule/ParseMatrixPlaningUseCase';
import { ParseServiceSheetUseCase } from '../use-cases/schedule/ParseServiceSheetUseCase';
import { ScanSportsMenuUseCase } from '../use-cases/schedule/ScanSportsMenuUseCase';
import { CalculateRequirementsUseCase } from '../use-cases/schedule/CalculateRequirementsUseCase';
import { SyncSportsMenuUseCase } from '../use-cases/schedule/SyncSportsMenuUseCase';
import {
  IProductionRepository,
  FirebaseProductionRepository,
} from '@/infrastructure/repositories/FirebaseProductionRepository';
import {
  IPurchasingRepository,
  FirebasePurchasingRepository,
} from '@/infrastructure/repositories/FirebasePurchasingRepository';
import { GetScheduleUseCase } from '../use-cases/schedule/GetScheduleUseCase';
import { GetEventsUseCase } from '../use-cases/schedule/GetEventsUseCase';
import { ImportEventsUseCase } from '../use-cases/schedule/ImportEventsUseCase';

// Employee Module Imports
import { IEmployeeRepository } from '@/domain/interfaces/repositories/IEmployeeRepository';
import { FirebaseEmployeeRepository } from '@/infrastructure/repositories/FirebaseEmployeeRepository';
import { GetEmployeesUseCase } from '../use-cases/employee/GetEmployeesUseCase';
import { SaveEmployeeUseCase } from '../use-cases/employee/SaveEmployeeUseCase';
import { DeleteEmployeeUseCase } from '../use-cases/employee/DeleteEmployeeUseCase';

// Shift & Event Repository Imports
import { IShiftRepository } from '@/domain/interfaces/repositories/IShiftRepository';
import { FirebaseShiftRepository } from '@/infrastructure/repositories/FirebaseShiftRepository';
import { IEventRepository } from '@/domain/interfaces/repositories/IEventRepository';
import { FirebaseEventRepository } from '@/infrastructure/repositories/FirebaseEventRepository';

export function bootstrap() {
  // Auth
  container
    .bind<IAuthRepository>(TYPES.AuthRepository)
    .to(FirebaseAuthRepository)
    .inSingletonScope();
  container.bind<LoginUseCase>(TYPES.LoginUseCase).to(LoginUseCase).inTransientScope();
  container
    .bind<LoginWithEmailUseCase>(TYPES.LoginWithEmailUseCase)
    .to(LoginWithEmailUseCase)
    .inTransientScope();

  // Repositories
  container
    .bind<IIngredientRepository>(TYPES.IngredientRepository)
    .to(FirebaseIngredientRepository)
    .inSingletonScope();
  container
    .bind<ICoreIngredientRepository>(TYPES.CoreIngredientRepository)
    .to(CoreIngredientRepositoryAdapter)
    .inSingletonScope();
  container
    .bind<IRecipeRepository>(TYPES.RecipeRepository)
    .to(FirebaseRecipeRepository)
    .inSingletonScope();
  container
    .bind<ICoreRecipeRepository>(TYPES.CoreRecipeRepository)
    .to(CoreRecipeRepositoryAdapter)
    .inSingletonScope();
  container
    .bind<ICoreBatchRepository>(TYPES.BatchRepository as any)
    .to(FirestoreBatchRepository)
    .inSingletonScope();
  container
    .bind<ITransactionManager>(TYPES.TransactionManager)
    .to(FirestoreTransactionManager)
    .inSingletonScope();
  container
    .bind<IInventoryRepository>(TYPES.InventoryRepository)
    .to(FirebaseInventoryRepository)
    .inSingletonScope();
  container
    .bind<ICoreStockTransactionRepository>(TYPES.StockTransactionRepository)
    .to(CoreStockTransactionRepositoryAdapter)
    .inSingletonScope();

  // Services
  container.bind<IAIService>(TYPES.AIService).to(GeminiAdapter).inSingletonScope();
  container.bind<IImportService>(TYPES.ImportService).to(ExcelImportService).inSingletonScope();

  // Use Cases - Ingredients
  container
    .bind<GetIngredientsUseCase>(TYPES.GetIngredientsUseCase)
    .to(GetIngredientsUseCase)
    .inTransientScope();
  container
    .bind<CoreGetIngredientsUseCase>(TYPES.CoreGetIngredientsUseCase)
    .toDynamicValue(() => {
      const coreRepo = container.get<ICoreIngredientRepository>(TYPES.CoreIngredientRepository);
      return new CoreGetIngredientsUseCase(coreRepo);
    })
    .inTransientScope();
  container
    .bind<CreateIngredientUseCase>(TYPES.CreateIngredientUseCase)
    .to(CreateIngredientUseCase)
    .inTransientScope();
  container
    .bind<CoreCreateIngredientUseCase>(TYPES.CoreCreateIngredientUseCase)
    .toDynamicValue(() => {
      const coreRepo = container.get<ICoreIngredientRepository>(TYPES.CoreIngredientRepository);
      return new CoreCreateIngredientUseCase(coreRepo);
    })
    .inTransientScope();
  container
    .bind<UpdateIngredientUseCase>(TYPES.UpdateIngredientUseCase)
    .to(UpdateIngredientUseCase)
    .inTransientScope();
  container
    .bind<CoreUpdateIngredientUseCase>(TYPES.CoreUpdateIngredientUseCase)
    .toDynamicValue(() => {
      const coreRepo = container.get<ICoreIngredientRepository>(TYPES.CoreIngredientRepository);
      return new CoreUpdateIngredientUseCase(coreRepo);
    })
    .inTransientScope();
  container
    .bind<DeleteIngredientUseCase>(TYPES.DeleteIngredientUseCase)
    .to(DeleteIngredientUseCase)
    .inTransientScope();
  container
    .bind<CoreDeleteIngredientUseCase>(TYPES.CoreDeleteIngredientUseCase)
    .toDynamicValue(() => {
      const coreRepo = container.get<ICoreIngredientRepository>(TYPES.CoreIngredientRepository);
      return new CoreDeleteIngredientUseCase(coreRepo);
    })
    .inTransientScope();
  container
    .bind<EnrichIngredientUseCase>(TYPES.EnrichIngredientUseCase)
    .to(EnrichIngredientUseCase)
    .inTransientScope();
  container
    .bind<ScanDocumentUseCase>(TYPES.ScanDocumentUseCase)
    .to(ScanDocumentUseCase)
    .inTransientScope();
  container
    .bind<ImportIngredientsUseCase>(TYPES.ImportIngredientsUseCase)
    .to(ImportIngredientsUseCase)
    .inTransientScope();

  // Use Cases - Recipe
  container
    .bind<CalculateRecipeCostUseCase>(TYPES.CalculateRecipeCostUseCase)
    .to(CalculateRecipeCostUseCase)
    .inTransientScope();
  container
    .bind<GetRecipesUseCase>(TYPES.GetRecipesUseCase)
    .to(GetRecipesUseCase)
    .inTransientScope();
  container
    .bind<CreateRecipeUseCase>(TYPES.CreateRecipeUseCase)
    .to(CreateRecipeUseCase)
    .inTransientScope();
  container
    .bind<UpdateRecipeUseCase>(TYPES.UpdateRecipeUseCase)
    .to(UpdateRecipeUseCase)
    .inTransientScope();
  container
    .bind<DeleteRecipeUseCase>(TYPES.DeleteRecipeUseCase)
    .to(DeleteRecipeUseCase)
    .inTransientScope();
  container
    .bind<CoreCalculateRecipeCostUseCase>(TYPES.CoreCalculateRecipeCostUseCase)
    .toDynamicValue(() => {
      const coreRepo = container.get<ICoreRecipeRepository>(TYPES.CoreRecipeRepository);
      const ingredientRepo = container.get<ICoreIngredientRepository>(
        TYPES.CoreIngredientRepository
      );
      return new CoreCalculateRecipeCostUseCase(coreRepo, ingredientRepo);
    })
    .inTransientScope();
  container
    .bind<CoreGetRecipesUseCase>(TYPES.CoreGetRecipesUseCase)
    .toDynamicValue(() => {
      const coreRepo = container.get<ICoreRecipeRepository>(TYPES.CoreRecipeRepository);
      return new CoreGetRecipesUseCase(coreRepo);
    })
    .inTransientScope();
  container
    .bind<CoreCreateRecipeUseCase>(TYPES.CoreCreateRecipeUseCase)
    .toDynamicValue(() => {
      const coreRepo = container.get<ICoreRecipeRepository>(TYPES.CoreRecipeRepository);
      return new CoreCreateRecipeUseCase(coreRepo);
    })
    .inTransientScope();
  container
    .bind<CoreUpdateRecipeUseCase>(TYPES.CoreUpdateRecipeUseCase)
    .toDynamicValue(() => {
      const coreRepo = container.get<ICoreRecipeRepository>(TYPES.CoreRecipeRepository);
      return new CoreUpdateRecipeUseCase(coreRepo);
    })
    .inTransientScope();
  container
    .bind<CoreDeleteRecipeUseCase>(TYPES.CoreDeleteRecipeUseCase)
    .toDynamicValue(() => {
      const coreRepo = container.get<ICoreRecipeRepository>(TYPES.CoreRecipeRepository);
      return new CoreDeleteRecipeUseCase(coreRepo);
    })
    .inTransientScope();

  // Use Cases - Inventory
  container
    .bind<RegisterStockMovementUseCase>(TYPES.RegisterStockMovementUseCase)
    .to(RegisterStockMovementUseCase)
    .inTransientScope();
  container
    .bind<GetInventoryStatusUseCase>(TYPES.GetInventoryStatusUseCase)
    .to(GetInventoryStatusUseCase)
    .inTransientScope();
  container
    .bind<PerformAuditUseCase>(TYPES.PerformAuditUseCase)
    .to(PerformAuditUseCase)
    .inTransientScope();

  // Core Inventory Use Cases
  container
    .bind<CoreAddBatchUseCase>(TYPES.AddBatchUseCase)
    .toDynamicValue(() => {
      return new CoreAddBatchUseCase(
        container.get(TYPES.BatchRepository),
        container.get(TYPES.CoreIngredientRepository),
        container.get(TYPES.StockTransactionRepository),
        container.get(TYPES.TransactionManager)
      );
    })
    .inTransientScope();

  container
    .bind<CoreGetInventoryStatusUseCase>(TYPES.CoreGetInventoryStatusUseCase)
    .toDynamicValue(() => {
      return new CoreGetInventoryStatusUseCase(
        container.get(TYPES.CoreIngredientRepository),
        container.get(TYPES.StockTransactionRepository)
      );
    })
    .inTransientScope();

  container
    .bind<CoreConsumeFIFOUseCase>(TYPES.ConsumeFIFOUseCase)
    .toDynamicValue(() => {
      return new CoreConsumeFIFOUseCase(
        container.get(TYPES.BatchRepository),
        container.get(TYPES.CoreIngredientRepository),
        container.get(TYPES.StockTransactionRepository),
        container.get(TYPES.TransactionManager)
      );
    })
    .inTransientScope();

  container
    .bind<CoreAdjustStockUseCase>(TYPES.AdjustStockUseCase)
    .toDynamicValue(() => {
      const addBatch = container.get<CoreAddBatchUseCase>(TYPES.AddBatchUseCase);
      const consume = container.get<CoreConsumeFIFOUseCase>(TYPES.ConsumeFIFOUseCase);
      return new CoreAdjustStockUseCase(addBatch, consume);
    })
    .inTransientScope();

  container
    .bind<CoreProcessStockMovementUseCase>(TYPES.CoreProcessStockMovementUseCase)
    .toDynamicValue(() => {
      const adjust = container.get<CoreAdjustStockUseCase>(TYPES.AdjustStockUseCase);
      return new CoreProcessStockMovementUseCase(adjust);
    })
    .inTransientScope();

  container
    .bind<CorePerformAuditUseCase>(TYPES.CorePerformAuditUseCase)
    .toDynamicValue(() => {
      const ingredientRepo = container.get<ICoreIngredientRepository>(
        TYPES.CoreIngredientRepository
      );
      const adjust = container.get<CoreAdjustStockUseCase>(TYPES.AdjustStockUseCase);
      return new CorePerformAuditUseCase(ingredientRepo, adjust);
    })
    .inTransientScope();

  // Analytics Use Cases
  container
    .bind<CalculateBCGMatrixUseCase>(TYPES.CalculateBCGMatrixUseCase)
    .toDynamicValue(() => {
      const coreRepo = container.get<ICoreRecipeRepository>(TYPES.CoreRecipeRepository);
      return new CalculateBCGMatrixUseCase(coreRepo);
    })
    .inTransientScope();

  container
    .bind<GenerateProfitabilityReportUseCase>(TYPES.GenerateProfitabilityReportUseCase)
    .toDynamicValue(() => {
      const coreRepo = container.get<ICoreRecipeRepository>(TYPES.CoreRecipeRepository);
      return new GenerateProfitabilityReportUseCase(coreRepo);
    })
    .inTransientScope();

  // Schedule & Events Use Cases
  container
    .bind<GenerateScheduleUseCase>(TYPES.GenerateScheduleUseCase)
    .to(GenerateScheduleUseCase)
    .inTransientScope();
  container
    .bind<ParseMatrixPlaningUseCase>(TYPES.ParseMatrixPlaningUseCase)
    .to(ParseMatrixPlaningUseCase)
    .inTransientScope();
  container
    .bind<ParseServiceSheetUseCase>(TYPES.PARSE_SERVICE_SHEET_USE_CASE)
    .to(ParseServiceSheetUseCase)
    .inTransientScope();
  container
    .bind<ScanSportsMenuUseCase>(TYPES.SCAN_SPORTS_MENU_USE_CASE)
    .to(ScanSportsMenuUseCase)
    .inTransientScope();
  container
    .bind<CalculateRequirementsUseCase>(TYPES.CALCULATE_REQUIREMENTS_USE_CASE)
    .to(CalculateRequirementsUseCase)
    .inTransientScope();
  container
    .bind<SyncSportsMenuUseCase>(TYPES.SYNC_SPORTS_MENU_USE_CASE)
    .to(SyncSportsMenuUseCase)
    .inTransientScope();

  container
    .bind<IProductionRepository>(TYPES.PRODUCTION_REPOSITORY)
    .to(FirebaseProductionRepository)
    .inSingletonScope();
  container
    .bind<IPurchasingRepository>(TYPES.PURCHASING_REPOSITORY)
    .to(FirebasePurchasingRepository)
    .inSingletonScope();
  container
    .bind<GetScheduleUseCase>(TYPES.GetScheduleUseCase)
    .to(GetScheduleUseCase)
    .inTransientScope();
  container.bind<GetEventsUseCase>(TYPES.GetEventsUseCase).to(GetEventsUseCase).inTransientScope();
  container
    .bind<ImportEventsUseCase>(TYPES.ImportEventsUseCase)
    .to(ImportEventsUseCase)
    .inTransientScope();

  // Employee Module
  container
    .bind<IEmployeeRepository>(TYPES.EmployeeRepository)
    .to(FirebaseEmployeeRepository)
    .inSingletonScope();
  container
    .bind<GetEmployeesUseCase>(TYPES.GetEmployeesUseCase)
    .to(GetEmployeesUseCase)
    .inTransientScope();
  container
    .bind<SaveEmployeeUseCase>(TYPES.SaveEmployeeUseCase)
    .to(SaveEmployeeUseCase)
    .inTransientScope();
  container
    .bind<DeleteEmployeeUseCase>(TYPES.DeleteEmployeeUseCase)
    .to(DeleteEmployeeUseCase)
    .inTransientScope();

  // Schedule & Events Repositories
  container
    .bind<IShiftRepository>(TYPES.ShiftRepository)
    .to(FirebaseShiftRepository)
    .inSingletonScope();
  container
    .bind<IEventRepository>(TYPES.EventRepository)
    .to(FirebaseEventRepository)
    .inSingletonScope();
}
