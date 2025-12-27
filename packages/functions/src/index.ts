import * as admin from "firebase-admin";

admin.initializeApp();

export { scanInvoice } from "./scanners/invoiceScanner";
export { searchRecipes } from "./search/recipeSearcher";
export { chatWithCopilot } from "./chat/kitchenCopilot";
export { predictDemand } from "./predictors/demandPredictor";
export { generateMenu } from "./generators/menuGenerator";
export { generatePurchaseOrder } from "./generators/orderGenerator";
export { enrichIngredient } from "./triggers/ingredientEnricher";
export { enrichIngredientCallable } from "./enrichers/ingredientEnricher";
export { embedRecipe } from "./triggers/recipeEmbedder";
export { monitorHACCP } from "./triggers/haccpMonitor";
export { calculateMenuEngineering } from "./scheduled/analyticsScheduler";
export { autoPurchaseScheduler } from "./scheduled/autoPurchaseScheduler";
export { getMenuAnalytics } from "./analytics/menuEngineeringCallable";
export { sendPurchaseOrderEmail } from "./triggers/sendPurchaseOrderEmail";
export { createOrderNotification } from "./triggers/createOrderNotification";
export { generateMonthlyHACCPReport } from "./scheduled/haccpScheduler";

// New KPI Triggers
export { onInventoryUpdate } from "./triggers/inventoryTriggers";
// export { onPurchaseOrderUpdate } from "./triggers/orderTriggers";
// export { onWasteRecordCreate } from "./triggers/wasteTriggers";

// Zero Waste Engine
export { getWasteSuggestions, applyWasteAction } from "./waste/zeroWasteEngine";

// BEO Scanner (Mission 1)
export { scanBEO } from "./triggers/beoScanner";

// Universal Ingestion (Mission 6)
export { analyzeDocument, parseStructuredFile, commitImport } from "./ingestion";

// Legacy Triggers (Scheduled for removal)
// export { processExcelImport } from "./triggers/excelProcessor";
// export { aiSmartImporter } from "./triggers/aiSmartImporter";



