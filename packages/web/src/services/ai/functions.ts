// import { getFunctions, httpsCallable } from 'firebase/functions';
// import { app } from '@/config/firebase';

// const functions = getFunctions(app, 'europe-southwest1'); // Standardized region for V2 callables

const dummyCallable = () => {
  throw new Error('AI functions are temporarily disabled during migration.');
};

export const scanInvoice = dummyCallable;
export const predictDemand = dummyCallable;
export const generateMenu = dummyCallable;
export const enrichIngredientCallable = dummyCallable;
export const searchRecipes = dummyCallable;
export const chatWithCopilot = dummyCallable;
