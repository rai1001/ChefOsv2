import type { Ingredient, NutritionalInfo } from './inventory';
import type { AutoPurchaseSettings } from './purchases';

// Re-export all types from modular files

export * from './inventory';
export * from './socialManager';
export * from './suppliers';
export * from './purchases';
export * from './fichasTecnicas';
export * from './waste';

export type RecipeCategory =
  | 'appetizer'
  | 'main'
  | 'dessert'
  | 'sauce'
  | 'base'
  | 'beverage'
  | 'other';
export type MenuCategory = 'tasting' | 'event' | 'daily' | 'corporate' | 'breakfast' | 'other';

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number; // Gross quantity needed
  ingredient?: Ingredient; // Hydrated
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  instructions?: string[];
  prepTime?: number;
  cookTime?: number;
  station: 'hot' | 'cold' | 'dessert';
  ingredients: RecipeIngredient[];
  isBase?: boolean; // True if this is a base recipe (e.g., from "Bases" sheet)
  totalCost?: number; // Calculated
  yieldPax?: number; // Portions/Yield of the recipe
  allergens?: string[]; // Calculated
  nutritionalInfo?: NutritionalInfo; // Calculated
  category?: RecipeCategory;
  outletId?: string;
  createdAt?: string;
  updatedAt?: string;
  image?: string;
}

export interface MenuVariation {
  dishName: string; // The original dish name
  alternativeDishName: string; // The variaton (e.g., "Hamburguesa Vegana")
  notes?: string;
}

export interface Menu {
  id: string;
  name: string;
  description?: string; // Added description
  recipeIds: string[];
  recipes?: Recipe[]; // Hydrated
  variations?: MenuVariation[]; // New field for variations
  sellPrice?: number;
  category?: MenuCategory;
  status?: 'active' | 'draft' | 'archived';
  outletId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type EventType =
  | 'Comida'
  | 'Cena'
  | 'Empresa'
  | 'Coctel'
  | 'Mediodia'
  | 'Noche'
  | 'Equipo Deportivo'
  | 'Coffee Break'
  | 'Boda'
  | 'Otros';

export interface Event {
  id: string;
  name: string;
  date: string; // ISO Date
  pax: number;
  type: EventType;
  room?: string; // New field for room grouping
  menuId?: string;
  menu?: Menu;
  notes?: string;
  outletId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PendingEvent {
  id: string;
  source: 'EMAIL_GMAIL' | 'EMAIL_OUTLOOK';
  sender: string;
  subject: string;
  receivedAt: string; // ISO Date
  snippet: string;
  // AI Extracted Data
  predictedTitle?: string;
  predictedDate?: string;
  predictedPax?: number;
  predictedMenuType?: EventType;
  confidenceScore: number;
  status: 'pending' | 'approved' | 'rejected';
}

export type KanbanTaskStatus = 'todo' | 'in-progress' | 'done';

export interface KanbanTask {
  id: string;
  title: string;
  quantity: number;
  unit: string;
  description: string;
  status: KanbanTaskStatus;
  recipeId?: string;
  station?: 'hot' | 'cold' | 'dessert';
  eventId?: string;
  outletId?: string;

  // Timer & Scheduling
  estimatedTime?: number; // In minutes
  timerStart?: number; // Timestamp (Date.now()) or null
  totalTimeSpent?: number; // In seconds
  shift?: ShiftType;
  assignedDate?: string; // YYYY-MM-DD
  assignedEmployeeId?: string;
}

// Staff & Scheduling Types

// Auth Types
export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  photoURL?: string;
  allowedOutlets?: string[]; // IDs of outlets this user can access
  defaultOutletId?: string;
}

export interface UserUpdateDTO {
  displayName?: string;
  role?: Role; // Updated to use Role type
  active?: boolean;
  allowedOutlets?: string[];
  defaultOutletId?: string;
}

export interface UserListItem {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: Role; // Updated to use Role type
  active: boolean;
  allowedOutlets: string[];
  defaultOutletId?: string;
  createdAt: string;
  updatedAt?: string;
}

export type Role =
  | 'admin'
  | 'chef'
  | 'staff'
  | 'HEAD_CHEF'
  | 'SOUS_CHEF'
  | 'CHEF_PARTIE'
  | 'COOK_MORNING'
  | 'COOK_ROTATING'
  | 'ASSISTANT'
  | 'DISHWASHER';

export interface Employee {
  id: string;
  name: string;
  role: Role;
  status: 'ACTIVE' | 'INACTIVE';
  // Stats for algorithm
  consecutiveWorkDays: number;
  daysOffInLast28Days: number;
  // Tracking
  vacationDaysTotal: number; // Annual allowance, default 30
  vacationDates: string[]; // ISO Dates (YYYY-MM-DD)
  sickLeaveDates?: string[]; // ISO Dates (YYYY-MM-DD)
  qualificationDocs?: { name: string; url: string; expiryDate?: string }[];
  hourlyRate?: number; // For Prime Cost calculation
  outletId?: string;
}

export type ShiftType = 'MORNING' | 'AFTERNOON' | 'OFF' | 'VACATION' | 'SICK_LEAVE';

export interface Shift {
  date: string; // YYYY-MM-DD
  employeeId: string;
  type: ShiftType;
}

export interface DailySchedule {
  date: string; // YYYY-MM-DD
  shifts: Shift[];
  validationErrors?: string[];
  staffingStatus: 'OK' | 'UNDERSTAFFED' | 'OVERSTAFFED';
}

// Waste Control Types

// HACCP Types

export type PCCType = 'FRIDGE' | 'FREEZER' | 'HOT_HOLDING' | 'COOLING' | 'OTHER';

export interface PCC {
  id: string;
  name: string;
  description?: string;
  type: PCCType;
  minTemp?: number;
  maxTemp?: number;
  isActive: boolean;
}

export interface HACCPLog {
  id: string;
  pccId: string;
  value: number;
  timestamp: string; // ISO Date
  userId: string; // Ideally linked to Employee
  status: 'CORRECT' | 'WARNING' | 'CRITICAL';
  notes?: string;
  pdfUrl?: string;
}

export type HACCPTaskFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface HACCPTask {
  id: string;
  name: string;
  description?: string;
  frequency: HACCPTaskFrequency;
  isActive: boolean;
}

export interface HACCPTaskCompletion {
  id: string;
  taskId: string;
  completedAt: string; // ISO Date
  completedBy: string; // User ID
  notes?: string;
}

export interface HACCPTimer {
  id: string;
  pccId: string;
  startTime: string; // ISO Date
  duration: number; // minutes
  label: string;
  status: 'ACTIVE' | 'EXPIRED' | 'COMPLETED';
}

// Menu Engineering (Boston Matrix) Types

export type DishClassification = 'star' | 'dog' | 'cash-cow' | 'puzzle';

export interface MenuItemAnalytics {
  recipeId: string;
  recipeName: string;
  totalRevenue: number; // Total revenue from this dish
  totalOrders: number; // Number of times ordered (sum of PAX across events)
  avgProfitPerServing: number; // Average profit per serving
  totalProfit: number; // Total profit across all orders
  popularityScore: number; // Percentage of total orders (0-1)
  profitabilityScore: number; // Profit margin percentage (0-1)
  classification: DishClassification;
  lastOrdered?: string; // ISO Date
}

// Hospitality Module Types
export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface HospitalityService {
  id: string; // YYYY-MM-DD_mealType
  date: string; // YYYY-MM-DD
  mealType: MealType;
  forecastPax: number;
  realPax: number;
  consumption: Record<string, number>; // ingredientId -> quantity
  notes?: string;
  outletId?: string;
  isCommitted?: boolean;
}

export interface OccupancyData {
  date: string;
  pax: number;
  mealType?: MealType;
}

// Multi-Kitchen / Outlet Management Types

export type OutletType = 'main_kitchen' | 'bar' | 'banquet' | 'room_service' | 'pizzeria' | 'other';

export interface Outlet {
  id: string;
  name: string;
  type: OutletType;
  isActive: boolean;
  address?: string;
  phone?: string;
  autoPurchaseSettings?: AutoPurchaseSettings;
  geminiApiKey?: string;
  workspaceAccount?: string;
  outlookAccount?: string;
}

// Extended types with Outlet context
export interface MenuWithOutlet extends Menu {
  outletId?: string;
}

export interface EventWithOutlet extends Event {
  outletId?: string;
}

export interface PageCursor {
  lastDate: string; // Using string (ISO) to match types.ts
  lastId: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: PageCursor | null;
  hasMore: boolean;
}

// AI Integration Types

export interface ProcessedInvoice {
  supplierName: string;
  date: string;
  totalCost: number;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total?: number;
  }[];
}

export interface GeneratedMenu {
  name: string;
  description: string;
  dishes: {
    name: string;
    description: string;
    category: string;
    allergens: string[];
  }[];
  estimatedCost?: number;
  sellPrice?: number;
}

export interface IngredientEnrichment {
  nutritionalInfo: NutritionalInfo;
  allergens: string[];
}

// Integrations Framework Types
export type IntegrationStatus = 'connected' | 'disconnected' | 'error';
export type IntegrationProvider = 'google' | 'microsoft';

export interface Integration {
  id: string;
  name: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  description: string;
  features: string[];
  connectedAt?: string;
  lastSyncAt?: string;
}

export interface DemandPrediction {
  suggestions: {
    ingredientName: string;
    quantity: number;
    unit: string;
    reason: string;
  }[];
}

export type ViewType =
  | 'dashboard'
  | 'schedule'
  | 'production'
  | 'data'
  | 'events'
  | 'recipes'
  | 'ingredients'
  | 'suppliers'
  | 'inventory'
  | 'purchasing'
  | 'waste'
  | 'haccp'
  | 'analytics'
  | 'kds'
  | 'ai-scanner'
  | 'ai-search'
  | 'ai-menu'
  | 'ai-ingredients'
  | 'outlets'
  | 'menus'
  | 'breakfast'
  | 'fichas-tecnicas';

export interface SportsMenuData {
  mealType: string;
  globalNotes?: string;
  handwrittenTranscriptions?: string;
  courses: {
    category?: string;
    items?: {
      name?: string;
      notes?: string;
      quantity?: string | number;
      isHandwritten?: boolean;
    }[];
  }[];
}

export interface AppNotification {
  id: string;
  type: 'HACCP_ALERT' | 'SYSTEM' | 'ORDER_UPDATE';
  title?: string;
  message: string;
  pccId?: string;
  orderId?: string;
  link?: string;
  read: boolean;
  timestamp: any; // Firestore Timestamp or Date
  outletId?: string;
}
