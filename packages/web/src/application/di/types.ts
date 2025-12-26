export const TYPES = {
    AuthRepository: Symbol.for("AuthRepository"),
    LoginUseCase: Symbol.for("LoginUseCase"),

    // Ingredients Module
    IngredientRepository: Symbol.for("IngredientRepository"),
    AIService: Symbol.for("AIService"),
    ImportService: Symbol.for("ImportService"),

    // Ingredients Use Cases
    GetIngredientsUseCase: Symbol.for("GetIngredientsUseCase"),
    CreateIngredientUseCase: Symbol.for("CreateIngredientUseCase"),
    UpdateIngredientUseCase: Symbol.for("UpdateIngredientUseCase"),
    DeleteIngredientUseCase: Symbol.for("DeleteIngredientUseCase"),
    EnrichIngredientUseCase: Symbol.for("EnrichIngredientUseCase"),
    ScanDocumentUseCase: Symbol.for("ScanDocumentUseCase"),
    ImportIngredientsUseCase: Symbol.for("ImportIngredientsUseCase"),
};
