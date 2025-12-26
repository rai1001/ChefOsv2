import { container } from './Container';
import { TYPES } from './types';
import { IAuthRepository } from '../../domain/interfaces/repositories/IAuthRepository';
import { FirebaseAuthRepository } from '../../infrastructure/repositories/FirebaseAuthRepository';
import { LoginUseCase } from '../use-cases/auth/LoginUseCase';

// Ingredients Module Imports
import { IIngredientRepository } from '../../domain/interfaces/repositories/IIngredientRepository';
import { FirebaseIngredientRepository } from '../../infrastructure/repositories/FirebaseIngredientRepository';
import { IAIService } from '../../domain/interfaces/services/IAIService';
import { FirebaseAIService } from '../../infrastructure/services/FirebaseAIService';
import { IImportService } from '../../domain/interfaces/services/IImportService';
import { ExcelImportService } from '../../infrastructure/services/ExcelImportService';
import { GetIngredientsUseCase } from '../use-cases/ingredients/GetIngredientsUseCase';
import { CreateIngredientUseCase } from '../use-cases/ingredients/CreateIngredientUseCase';
import { UpdateIngredientUseCase } from '../use-cases/ingredients/UpdateIngredientUseCase';
import { DeleteIngredientUseCase } from '../use-cases/ingredients/DeleteIngredientUseCase';
import { EnrichIngredientUseCase } from '../use-cases/ingredients/EnrichIngredientUseCase';
import { ScanDocumentUseCase } from '../use-cases/ingredients/ScanDocumentUseCase';
import { ImportIngredientsUseCase } from '../use-cases/ingredients/ImportIngredientsUseCase';
// Duplicate imports removed

export function bootstrap() {
  // Auth
  container.bind<IAuthRepository>(TYPES.AuthRepository).to(FirebaseAuthRepository).inSingletonScope();
  container.bind<LoginUseCase>(TYPES.LoginUseCase).to(LoginUseCase).inTransientScope();

  // Services
  container.bind<IIngredientRepository>(TYPES.IngredientRepository).to(FirebaseIngredientRepository).inSingletonScope();
  container.bind<IAIService>(TYPES.AIService).to(FirebaseAIService).inSingletonScope();
  container.bind<IImportService>(TYPES.ImportService).to(ExcelImportService).inSingletonScope();

  // Use Cases
  container.bind<GetIngredientsUseCase>(TYPES.GetIngredientsUseCase).to(GetIngredientsUseCase).inTransientScope();
  container.bind<CreateIngredientUseCase>(TYPES.CreateIngredientUseCase).to(CreateIngredientUseCase).inTransientScope();
  container.bind<UpdateIngredientUseCase>(TYPES.UpdateIngredientUseCase).to(UpdateIngredientUseCase).inTransientScope();
  container.bind<DeleteIngredientUseCase>(TYPES.DeleteIngredientUseCase).to(DeleteIngredientUseCase).inTransientScope();
  container.bind<EnrichIngredientUseCase>(TYPES.EnrichIngredientUseCase).to(EnrichIngredientUseCase).inTransientScope();
  container.bind<ScanDocumentUseCase>(TYPES.ScanDocumentUseCase).to(ScanDocumentUseCase).inTransientScope();
  container.bind<ImportIngredientsUseCase>(TYPES.ImportIngredientsUseCase).to(ImportIngredientsUseCase).inTransientScope();

  // Legacy Support (keep if needed, or remove)
  // container.bind("Container").toConstantValue(container);

  // Legacy/Example bindings (Commented out until migrated or confirmed)
  /*
  container.bind<ITransactionManager>(TOKENS.TRANSACTION_MANAGER).to(FirestoreTransactionManager).inSingletonScope();
  container.bind<IIngredientRepository>(TOKENS.INGREDIENT_REPOSITORY).to(FirestoreIngredientRepository).inSingletonScope();
  container.bind<IBatchRepository>(TOKENS.BATCH_REPOSITORY).to(FirestoreBatchRepository).inSingletonScope();
  
  container.bind<AddBatchUseCase>(TOKENS.ADD_BATCH_USE_CASE).toDynamicValue((context) => {
      return new AddBatchUseCase(
          context.container.get(TOKENS.BATCH_REPOSITORY),
          context.container.get(TOKENS.INGREDIENT_REPOSITORY),
          context.container.get(TOKENS.TRANSACTION_MANAGER)
      );
  });
  */
}
