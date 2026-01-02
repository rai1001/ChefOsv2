import * as admin from 'firebase-admin';
import { setGlobalOptions } from 'firebase-functions/v2';

setGlobalOptions({ region: 'europe-southwest1' });

admin.initializeApp();

export { scanInvoice } from './scanners/invoiceScanner';
export { scanInvoiceV2 } from './scanners/invoiceScannerV2'; // Cloud Vision OCR (1000 FREE/month)
export { searchRecipes } from './search/recipeSearcher';
export { chatWithCopilot } from './chat/kitchenCopilot';
export { predictDemand } from './predictors/demandPredictor';
export { generateMenu } from './generators/menuGenerator';
export { generatePurchaseOrder } from './generators/orderGenerator';
export { enrichIngredient } from './triggers/ingredientEnricher';
export { enrichIngredientCallable } from './enrichers/ingredientEnricher';
export { embedRecipe } from './triggers/recipeEmbedder';
export { monitorHACCP } from './triggers/haccpMonitor';
export { calculateMenuEngineering } from './scheduled/analyticsScheduler';
export { autoPurchaseScheduler } from './scheduled/autoPurchaseScheduler';
export { getMenuAnalytics } from './analytics/menuEngineeringCallable';
export { sendPurchaseOrderEmail } from './triggers/sendPurchaseOrderEmail';
export { createOrderNotification } from './triggers/createOrderNotification';
export { generateMonthlyHACCPReport } from './scheduled/haccpScheduler';
export { resetDailyBudgets, sendWeeklyBudgetReport } from './scheduled/budgetScheduler';
export { onBudgetUpdate } from './triggers/budgetAlerts';
export { onInvitationCreated } from './triggers/onInvitationCreated';
export { acceptInvitation } from './invitations/acceptInvitation';

// New KPI Triggers
export { onInventoryUpdate } from './triggers/inventoryTriggers';
// export { onPurchaseOrderUpdate } from "./triggers/orderTriggers";
// export { onWasteRecordCreate } from "./triggers/wasteTriggers";

// Zero Waste Engine
export { getWasteSuggestions, applyWasteAction } from './waste/zeroWasteEngine';

// Social Chef (Marketing)
export { generateMarketingContent } from './socialChef';

// Social Manager Pro
export { generateSocialContent } from './socialManager';

// BEO Scanner (Mission 1)
export { scanBEO } from './triggers/beoScanner';

// Universal Ingestion (Mission 6)
export {
  analyzeDocument,
  parseStructuredFile,
  commitImport,
  classifyIngredients,
} from './ingestion';

// Invoice OCR (Priority Use Case)
export { processRestaurantInvoice } from './triggers/invoiceUpload';

// Maintenance Functions
export { fixIngredientsData, deleteAllIngredients } from './ingestion';

// Legacy Triggers (Scheduled for removal)
// export { processExcelImport } from "./triggers/excelProcessor";
// export { aiSmartImporter } from "./triggers/aiSmartImporter";
