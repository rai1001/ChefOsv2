export const TYPES = {
  AuthRepository: Symbol.for('AuthRepository'),
  LoginUseCase: Symbol.for('LoginUseCase'),
  LoginWithEmailUseCase: Symbol.for('LoginWithEmailUseCase'),

  // Ingredients Module
  IngredientRepository: Symbol.for('IngredientRepository'),
  CoreIngredientRepository: Symbol.for('CoreIngredientRepository'), // Core interface
  RecipeRepository: Symbol.for('RecipeRepository'), // Added
  AIService: Symbol.for('AIService'),
  ImportService: Symbol.for('ImportService'),

  // Ingredients Use Cases
  GetIngredientsUseCase: Symbol.for('GetIngredientsUseCase'),
  CoreGetIngredientsUseCase: Symbol.for('CoreGetIngredientsUseCase'),
  CreateIngredientUseCase: Symbol.for('CreateIngredientUseCase'),
  CoreCreateIngredientUseCase: Symbol.for('CoreCreateIngredientUseCase'),
  UpdateIngredientUseCase: Symbol.for('UpdateIngredientUseCase'),
  CoreUpdateIngredientUseCase: Symbol.for('CoreUpdateIngredientUseCase'),
  DeleteIngredientUseCase: Symbol.for('DeleteIngredientUseCase'),
  CoreDeleteIngredientUseCase: Symbol.for('CoreDeleteIngredientUseCase'),
  EnrichIngredientUseCase: Symbol.for('EnrichIngredientUseCase'),
  ScanDocumentUseCase: Symbol.for('ScanDocumentUseCase'),
  ImportIngredientsUseCase: Symbol.for('ImportIngredientsUseCase'),

  // Recipe Use Cases
  CalculateRecipeCostUseCase: Symbol.for('CalculateRecipeCostUseCase'),
  GetRecipesUseCase: Symbol.for('GetRecipesUseCase'),
  CreateRecipeUseCase: Symbol.for('CreateRecipeUseCase'),
  UpdateRecipeUseCase: Symbol.for('UpdateRecipeUseCase'),
  DeleteRecipeUseCase: Symbol.for('DeleteRecipeUseCase'),

  // Inventory Module
  InventoryRepository: Symbol.for('InventoryRepository'),
  RegisterStockMovementUseCase: Symbol.for('RegisterStockMovementUseCase'),
  GetInventoryStatusUseCase: Symbol.for('GetInventoryStatusUseCase'),
  PerformAuditUseCase: Symbol.for('PerformAuditUseCase'),

  // Analytics Module
  CalculateBCGMatrixUseCase: Symbol.for('CalculateBCGMatrixUseCase'),

  // Schedule & Events Module
  ShiftRepository: Symbol.for('ShiftRepository'),
  EventRepository: Symbol.for('EventRepository'),
  EmployeeRepository: Symbol.for('EmployeeRepository'),
  GenerateScheduleUseCase: Symbol.for('GenerateScheduleUseCase'),
  ParseMatrixPlaningUseCase: Symbol.for('ParseMatrixPlaningUseCase'),
  PARSE_SERVICE_SHEET_USE_CASE: Symbol.for('ParseServiceSheetUseCase'),
  SCAN_SPORTS_MENU_USE_CASE: Symbol.for('ScanSportsMenuUseCase'),
  CALCULATE_REQUIREMENTS_USE_CASE: Symbol.for('CalculateRequirementsUseCase'),
  SYNC_SPORTS_MENU_USE_CASE: Symbol.for('SyncSportsMenuUseCase'),
  PRODUCTION_REPOSITORY: Symbol.for('IProductionRepository'),
  PURCHASING_REPOSITORY: Symbol.for('IPurchasingRepository'),
  GetScheduleUseCase: Symbol.for('GetScheduleUseCase'),
  GetEventsUseCase: Symbol.for('GetEventsUseCase'),
  ImportEventsUseCase: Symbol.for('ImportEventsUseCase'),

  // Employee Module
  GetEmployeesUseCase: Symbol.for('GetEmployeesUseCase'),
  SaveEmployeeUseCase: Symbol.for('SaveEmployeeUseCase'),
  DeleteEmployeeUseCase: Symbol.for('DeleteEmployeeUseCase'),
};
