import { container } from './Container';
import { TYPES } from './types';
import { IAuthRepository } from '@/domain/interfaces/repositories/IAuthRepository';
// import { FirebaseAuthRepository } from '@/infrastructure/repositories/FirebaseAuthRepository'; // Replaced by Supabase
import { SupabaseAuthRepository } from '@/infrastructure/repositories/SupabaseAuthRepository';
import { LoginUseCase } from '../use-cases/auth/LoginUseCase';
import { LoginWithEmailUseCase } from '../use-cases/auth/LoginWithEmailUseCase';

// Ingredients Module Imports
import { IIngredientRepository } from '@/domain/interfaces/repositories/IIngredientRepository';
// import { FirebaseIngredientRepository } from '@/infrastructure/repositories/FirebaseIngredientRepository';
import { SupabaseIngredientRepository } from '@/infrastructure/repositories/SupabaseIngredientRepository';
// import { HybridIngredientRepository } from '@/infrastructure/repositories/HybridIngredientRepository';
import { IAIService } from '@/domain/interfaces/services/IAIService';
import { SupabaseAIAdapter } from '@/services/adapters/SupabaseAIAdapter';
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

// Core Interfaces & Use Cases
// Core Interfaces & Use Cases
import {
  // Interfaces
  IFichaTecnicaRepository as ICoreRecipeRepository,
  IIngredientRepository as ICoreIngredientRepository,
  IBatchRepository,
  ITransactionManager,
  IStockTransactionRepository as ICoreStockTransactionRepository,

  // Use Cases
  ProcessStockMovementUseCase as CoreProcessStockMovementUseCase,
  PerformAuditUseCase as CorePerformAuditUseCase,
  GetInventoryStatusUseCase as CoreGetInventoryStatusUseCase,
  CalculateFichaCostUseCase as CoreCalculateRecipeCostUseCase,
  AddBatchUseCase as CoreAddBatchUseCase,
  AdjustStockUseCase as CoreAdjustStockUseCase,
  ConsumeFIFOUseCase as CoreConsumeFIFOUseCase,

  // Recipe Use Cases
  GetFichasTecnicasUseCase as CoreGetRecipesUseCase,
  CreateFichaTecnicaUseCase as CoreCreateRecipeUseCase,
  UpdateFichaTecnicaUseCase as CoreUpdateRecipeUseCase,
  DeleteFichaTecnicaUseCase as CoreDeleteRecipeUseCase,
  // Removed failing GetFichaTecnicaUseCase if not exists, or replace with GetFichaByIdUseCase if guessed

  // Ingredient Use Cases
  GetIngredientsUseCase as CoreGetIngredientsUseCase,
  CreateIngredientUseCase as CoreCreateIngredientUseCase,
  UpdateIngredientUseCase as CoreUpdateIngredientUseCase,
  DeleteIngredientUseCase as CoreDeleteIngredientUseCase,

  // Analytics
  CalculateBCGMatrixUseCase,
  GenerateProfitabilityReportUseCase,
} from '@culinaryos/core';

import { IRecipeRepository } from '@/domain/interfaces/repositories/IRecipeRepository';
import { SupabaseRecipeRepository } from '@/infrastructure/repositories/SupabaseRecipeRepository'; // NEW IMPORT
import { CoreRecipeRepositoryAdapter } from '@/adapters/repositories/CoreRecipeRepositoryAdapter';
import { CalculateRecipeCostUseCase } from '../use-cases/recipes/CalculateRecipeCostUseCase';
import { SupabasePurchasingRepository } from '@/infrastructure/repositories/SupabasePurchasingRepository';
import { SupabaseProductionRepository } from '@/infrastructure/repositories/SupabaseProductionRepository';
import { IProductionTaskRepository } from '@culinaryos/core';
import { IPurchaseOrderRepository } from '@culinaryos/core';
import { GetRecipesUseCase } from '../use-cases/recipes/GetRecipesUseCase';
import { CreateRecipeUseCase } from '../use-cases/recipes/CreateRecipeUseCase';
import { UpdateRecipeUseCase } from '../use-cases/recipes/UpdateRecipeUseCase';
import { DeleteRecipeUseCase } from '../use-cases/recipes/DeleteRecipeUseCase';

import { IInventoryRepository } from '@/domain/repositories/IInventoryRepository';
import { SupabaseInventoryRepository } from '@/infrastructure/repositories/SupabaseInventoryRepository';
import { SupabaseBatchRepository } from '@/infrastructure/repositories/SupabaseBatchRepository';
import { SupabaseTransactionManager } from '@/infrastructure/repositories/SupabaseTransactionManager';
import { SupabaseStockTransactionRepository } from '@/infrastructure/repositories/SupabaseStockTransactionRepository'; // FIXED IMPORT
import { ISupplierRepository } from '@/domain/interfaces/repositories/ISupplierRepository';
import { SupabaseSupplierRepository } from '@/infrastructure/repositories/SupabaseSupplierRepository';

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
import { GetScheduleUseCase } from '../use-cases/schedule/GetScheduleUseCase';
import { GetEventsUseCase } from '../use-cases/schedule/GetEventsUseCase';
import { ImportEventsUseCase } from '../use-cases/schedule/ImportEventsUseCase';

// Employee Module Imports
import { IEmployeeRepository } from '@/domain/interfaces/repositories/IEmployeeRepository';
import { GetEmployeesUseCase } from '../use-cases/employee/GetEmployeesUseCase';
import { SaveEmployeeUseCase } from '../use-cases/employee/SaveEmployeeUseCase';
import { DeleteEmployeeUseCase } from '../use-cases/employee/DeleteEmployeeUseCase';
import { SupabaseEmployeeRepository } from '@/infrastructure/repositories/SupabaseEmployeeRepository';

// Shift & Event Repository Imports
import { IShiftRepository } from '@/domain/interfaces/repositories/IShiftRepository';
import { SupabaseShiftRepository } from '@/infrastructure/repositories/SupabaseShiftRepository';
import { IEventRepository } from '@/domain/interfaces/repositories/IEventRepository';
// import { FirebaseEventRepository } from '@/infrastructure/repositories/FirebaseEventRepository'; // Legacy
import { SupabaseEventRepository } from '@/infrastructure/repositories/SupabaseEventRepository';

// User Management Imports
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { SupabaseUserRepository } from '@/infrastructure/repositories/SupabaseUserRepository';
import { ListUsersUseCase } from '@/application/use-cases/user-management/ListUsersUseCase';
import { UpdateUserUseCase } from '@/application/use-cases/user-management/UpdateUserUseCase';
import { ActivateUserUseCase } from '@/application/use-cases/user-management/ActivateUserUseCase';
import { DeactivateUserUseCase } from '@/application/use-cases/user-management/DeactivateUserUseCase';
import { DeleteUserUseCase } from '@/application/use-cases/user-management/DeleteUserUseCase';
import { AssignOutletsUseCase } from '@/application/use-cases/user-management/AssignOutletsUseCase';
import { ChangeUserRoleUseCase } from '@/application/use-cases/user-management/ChangeUserRoleUseCase';
import { InviteUserUseCase } from '@/application/use-cases/user-management/InviteUserUseCase';
import { ListInvitationsUseCase } from '@/application/use-cases/user-management/ListInvitationsUseCase';
import { DeleteInvitationUseCase } from '@/application/use-cases/user-management/DeleteInvitationUseCase';
import { IOutletRepository } from '@/domain/interfaces/repositories/IOutletRepository';
import { SupabaseOutletRepository } from '@/infrastructure/repositories/SupabaseOutletRepository';

import { IMenuRepository } from '@/domain/interfaces/repositories/IMenuRepository';
import { SupabaseMenuRepository } from '@/infrastructure/repositories/SupabaseMenuRepository';

export function bootstrap() {
  // ... existing bindings ...

  // Menus
  container
    .bind<IMenuRepository>(TYPES.MenuRepository)
    .to(SupabaseMenuRepository)
    .inSingletonScope();

  // Auth
  container
    .bind<IAuthRepository>(TYPES.AuthRepository)
    .to(SupabaseAuthRepository) // SWITCHED TO SUPABASE
    .inSingletonScope();

  container
    .bind<IAuthRepository>(TYPES.SupabaseAuthRepository)
    .to(SupabaseAuthRepository)
    .inSingletonScope();

  container.bind<LoginUseCase>(TYPES.LoginUseCase).to(LoginUseCase).inTransientScope();
  container
    .bind<LoginWithEmailUseCase>(TYPES.LoginWithEmailUseCase)
    .to(LoginWithEmailUseCase)
    .inTransientScope();

  // Repositories
  // Ingredients
  container
    .bind<IIngredientRepository>(TYPES.IngredientRepository)
    .to(SupabaseIngredientRepository) // FULL SUPABASE
    .inSingletonScope();

  // Bind Named Implementations for Hybrid Repository
  /*
  container
    .bind<IIngredientRepository>(TYPES.FirebaseIngredientRepository)
    .to(FirebaseIngredientRepository)
    .inSingletonScope();
  */

  container
    .bind<IIngredientRepository>(TYPES.SupabaseIngredientRepository)
    .to(SupabaseIngredientRepository)
    .inSingletonScope();
  /*
  container
    .bind<IIngredientRepository>(TYPES.HybridIngredientRepository)
    .to(HybridIngredientRepository)
    .inSingletonScope();
  */
  container
    .bind<ICoreIngredientRepository>(TYPES.CoreIngredientRepository)
    .to(CoreIngredientRepositoryAdapter)
    .inSingletonScope();

  // Recipes
  container
    .bind<IRecipeRepository>(TYPES.RecipeRepository)
    .to(SupabaseRecipeRepository) // FULL SUPABASE
    .inSingletonScope();

  container
    .bind<IRecipeRepository>(TYPES.SupabaseRecipeRepository)
    .to(SupabaseRecipeRepository)
    .inSingletonScope();
  container
    .bind<ICoreRecipeRepository>(TYPES.CoreRecipeRepository)
    .to(CoreRecipeRepositoryAdapter)
    .inSingletonScope();

  // Inventory & Stock
  container
    .bind<IBatchRepository>(TYPES.BatchRepository)
    .to(SupabaseBatchRepository) // SWITCHED TO SUPABASE
    .inSingletonScope();
  container
    .bind<ITransactionManager>(TYPES.TransactionManager)
    .to(SupabaseTransactionManager) // SWITCHED TO SUPABASE
    .inSingletonScope();
  container
    .bind<IInventoryRepository>(TYPES.InventoryRepository)
    .to(SupabaseInventoryRepository) // SWITCHED TO SUPABASE
    .inSingletonScope();
  container
    .bind<ICoreStockTransactionRepository>(TYPES.StockTransactionRepository)
    .to(SupabaseStockTransactionRepository) // SWITCHED TO SUPABASE
    .inSingletonScope();

  container
    .bind<ICoreStockTransactionRepository>(TYPES.SupabaseStockTransactionRepository)
    .to(SupabaseStockTransactionRepository)
    .inSingletonScope();

  // Services - AI
  // Use SupabaseAIAdapter for secure server-side AI calls via Edge Functions
  container.bind<IAIService>(TYPES.AIService).to(SupabaseAIAdapter).inSingletonScope();

  container.bind<IImportService>(TYPES.ImportService).to(ExcelImportService).inSingletonScope();

  // Suppliers
  container
    .bind<ISupplierRepository>(TYPES.SupplierRepository)
    .to(SupabaseSupplierRepository) // SWITCHED TO SUPABASE
    .inSingletonScope();
  container
    .bind<ISupplierRepository>(TYPES.SupabaseSupplierRepository)
    .to(SupabaseSupplierRepository)
    .inSingletonScope();

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
    .bind<IProductionTaskRepository>(TYPES.PRODUCTION_REPOSITORY)
    .to(SupabaseProductionRepository) // FULL SUPABASE
    .inSingletonScope();
  container
    .bind<IProductionTaskRepository>(TYPES.SupabaseProductionRepository)
    .to(SupabaseProductionRepository)
    .inSingletonScope();

  container
    .bind<IPurchaseOrderRepository>(TYPES.PURCHASING_REPOSITORY)
    .to(SupabasePurchasingRepository) // FULL SUPABASE
    .inSingletonScope();
  container
    .bind<IPurchaseOrderRepository>(TYPES.SupabasePurchasingRepository)
    .to(SupabasePurchasingRepository)
    .inSingletonScope();

  // Suppliers
  container
    .bind<ISupplierRepository>(TYPES.SupplierRepository)
    .to(SupabaseSupplierRepository)
    .inSingletonScope();
  container
    .bind<ISupplierRepository>(TYPES.SupabaseSupplierRepository)
    .to(SupabaseSupplierRepository)
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
    .to(SupabaseEmployeeRepository) // SWITCHED TO SUPABASE
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
    .to(SupabaseShiftRepository) // FULL SUPABASE
    .inSingletonScope();
  container
    .bind<IEventRepository>(TYPES.EventRepository)
    .to(SupabaseEventRepository) // FULL SUPABASE
    .inSingletonScope();

  // User Management
  container
    .bind<IUserRepository>(TYPES.UserRepository)
    .to(SupabaseUserRepository)
    .inSingletonScope();
  container.bind<ListUsersUseCase>(TYPES.ListUsersUseCase).to(ListUsersUseCase).inTransientScope();
  container
    .bind<UpdateUserUseCase>(TYPES.UpdateUserUseCase)
    .to(UpdateUserUseCase)
    .inTransientScope();
  container
    .bind<ActivateUserUseCase>(TYPES.ActivateUserUseCase)
    .to(ActivateUserUseCase)
    .inTransientScope();
  container
    .bind<DeactivateUserUseCase>(TYPES.DeactivateUserUseCase)
    .to(DeactivateUserUseCase)
    .inTransientScope();
  container
    .bind<DeleteUserUseCase>(TYPES.DeleteUserUseCase)
    .to(DeleteUserUseCase)
    .inTransientScope();
  container
    .bind<AssignOutletsUseCase>(TYPES.AssignOutletsUseCase)
    .to(AssignOutletsUseCase)
    .inTransientScope();
  container
    .bind<ChangeUserRoleUseCase>(TYPES.ChangeUserRoleUseCase)
    .to(ChangeUserRoleUseCase)
    .inTransientScope();
  container
    .bind<InviteUserUseCase>(TYPES.InviteUserUseCase)
    .to(InviteUserUseCase)
    .inTransientScope();
  container
    .bind<ListInvitationsUseCase>(TYPES.ListInvitationsUseCase)
    .to(ListInvitationsUseCase)
    .inTransientScope();
  container
    .bind<DeleteInvitationUseCase>(TYPES.DeleteInvitationUseCase)
    .to(DeleteInvitationUseCase)
    .inTransientScope();

  // Outlets
  container
    .bind<IOutletRepository>(TYPES.OutletRepository)
    .to(SupabaseOutletRepository)
    .inSingletonScope();
  container
    .bind<IOutletRepository>(TYPES.SupabaseOutletRepository)
    .to(SupabaseOutletRepository)
    .inSingletonScope();
}
