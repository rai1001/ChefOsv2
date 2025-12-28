import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/config/firebase';

const functions = getFunctions(app, 'europe-southwest1'); // Standardized region for V2 callables

export const scanInvoice = httpsCallable(functions, 'scanInvoice');
export const predictDemand = httpsCallable(functions, 'predictDemand');
export const generateMenu = httpsCallable(functions, 'generateMenu');
export const enrichIngredientCallable = httpsCallable(functions, 'enrichIngredientCallable');
export const searchRecipes = httpsCallable(functions, 'searchRecipes');
export const chatWithCopilot = httpsCallable(functions, 'chatWithCopilot');
