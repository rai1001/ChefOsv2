import type {
  Ingredient,
  IngredientBatch,
  Event,
  Employee,
  DailySchedule,
  Recipe,
  Menu,
  Supplier,
  PurchaseOrder,
  WasteRecord,
  PCC,
  HACCPLog,
  HACCPTask,
  HACCPTaskCompletion,
  HACCPTimer,
  MenuItemAnalytics,
  KanbanTask,
  KanbanTaskStatus,
  HospitalityService,
  OccupancyData,
  Integration,
  InventoryItem,
  Outlet,
  User,
  ShiftType,
  PageCursor,
  PurchaseOrderFilters,
  AppNotification,
} from '@/types';

export type {
  Ingredient,
  IngredientBatch,
  Event,
  Employee,
  DailySchedule,
  Recipe,
  Menu,
  Supplier,
  PurchaseOrder,
  WasteRecord,
  PCC,
  HACCPLog,
  HACCPTask,
  HACCPTaskCompletion,
  HACCPTimer,
  MenuItemAnalytics,
  KanbanTask,
  KanbanTaskStatus,
  HospitalityService,
  OccupancyData,
  Integration,
  InventoryItem,
  Outlet,
  User,
  ShiftType,
  PageCursor,
  PurchaseOrderFilters,
  AppNotification,
};
export interface NotificationSlice {
  notifications: AppNotification[];
  setNotifications: (notifications: AppNotification[]) => void;
  addNotification: (notification: AppNotification) => void;
  markAsRead: (id: string) => void;
}

export interface HospitalitySlice {
  hospitalityServices: HospitalityService[];
  setHospitalityServices: (services: HospitalityService[]) => void;
  updateHospitalityService: (service: HospitalityService) => Promise<void>;
  importOccupancy: (data: OccupancyData[]) => Promise<void>;
  fetchHospitalityServices: (date?: string) => Promise<void>;
  commitHospitalityConsumption: (serviceId: string) => Promise<void>;
}

export interface IngredientSlice {
  ingredients: Ingredient[];
  setIngredients: (items: Ingredient[]) => void;
  addIngredient: (ingredient: Ingredient) => Promise<void>;
  updateIngredient: (ingredient: Ingredient) => Promise<void>;
}

export interface EventSlice {
  events: Event[];
  eventsLoading: boolean;
  eventsError: string | null;
  eventsRange: { start: string; end: string } | null;
  setEvents: (events: Event[]) => void;
  addEvent: (event: Event) => Promise<void>;
  addEvents: (events: import('@/types').Event[]) => Promise<void>;
  clearEvents: () => Promise<void>;
  updateEvent: (event: import('@/types').Event) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getFilteredEvents: () => Event[];
  fetchEventsRange: (start: string, end: string) => Promise<void>;
}

export interface ProductionSlice {
  selectedProductionEventId: string | null;
  productionTasks: Record<string, KanbanTask[]>; // { eventId: [tasks] }
  setSelectedProductionEventId: (id: string | null) => void;
  generateProductionTasks: (event: Event) => Promise<void>;
  updateTaskStatus: (eventId: string, taskId: string, status: KanbanTaskStatus) => Promise<void>;
  todayProductionStats?: { total: number; completed: number; pending: number }; // Computed?
  clearProductionTasks: (eventId: string) => Promise<void>;
  setProductionTasks: (eventId: string, tasks: KanbanTask[]) => void;
  replaceAllProductionTasks: (tasksByEvent: Record<string, KanbanTask[]>) => void;
  toggleTaskTimer: (eventId: string, taskId: string) => Promise<void>;
  updateTaskSchedule: (
    eventId: string,
    taskId: string,
    updates: {
      assignedDate?: string;
      shift?: import('@/types').ShiftType;
      assignedEmployeeId?: string;
    }
  ) => Promise<void>;
  addProductionTask: (eventId: string, task: import('@/types').KanbanTask) => Promise<void>;
  deleteProductionTask: (eventId: string, taskId: string) => Promise<void>;
}

export interface StaffSlice {
  staff: Employee[];
  schedule: Record<string, DailySchedule>;
  setStaff: (items: Employee[]) => void;
  addEmployee: (employee: Employee) => Promise<void>;
  updateEmployee: (employee: Employee) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  updateSchedule: (month: string, schedule: DailySchedule) => void;
  updateShift: (dateStr: string, employeeId: string, type: import('@/types').ShiftType) => void;
  removeShift: (dateStr: string, employeeId: string) => void;
  saveSchedule: (month: string) => Promise<void>;
  fetchSchedule: (month: string) => Promise<void>;
}

export interface RecipeSlice {
  recipes: Recipe[];
  setRecipes: (recipes: Recipe[]) => void;
  addRecipe: (recipe: Recipe) => Promise<void>;
  updateRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
}

export interface MenuSlice {
  menus: Menu[];
  setMenus: (menus: Menu[]) => void;
  addMenu: (menu: Menu) => Promise<void>;
  updateMenu: (menu: Menu) => Promise<void>;
  deleteMenu: (id: string) => Promise<void>;
}

export interface PurchaseSlice {
  suppliers: Supplier[];

  // Pagination State
  purchaseOrders: PurchaseOrder[];
  purchaseOrdersLoading: boolean;
  purchaseOrdersError: string | null;
  purchaseOrdersHasMore: boolean;
  purchaseOrdersCursor: import('@/types').PageCursor | null;
  purchaseOrdersFilters: import('@/types').PurchaseOrderFilters;

  setSuppliers: (suppliers: Supplier[]) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (id: string) => void;
  clearSuppliers: () => void;

  // Purchase Order Actions
  setPurchaseOrders: (purchaseOrders: PurchaseOrder[]) => void; // Keep for legacy or manual set
  addPurchaseOrder: (order: PurchaseOrder) => void;
  updatePurchaseOrder: (order: PurchaseOrder) => void;
  deletePurchaseOrder: (id: string) => void;
  // Async Actions
  fetchPurchaseOrders: (options?: { reset?: boolean }) => Promise<void>;
  loadMorePurchaseOrders: () => Promise<void>;
  setPurchaseOrderFilters: (filters: import('@/types').PurchaseOrderFilters) => void;
  receivePurchaseOrderItems: (
    orderId: string,
    receivedItems: Record<string, number>
  ) => Promise<void>;
  purchasingNotes: string;
  updatePurchasingNotes: (notes: string) => Promise<void>;
}

export interface WasteSlice {
  wasteRecords: WasteRecord[];
  setWasteRecords: (records: WasteRecord[]) => void;
  addWasteRecord: (record: WasteRecord) => Promise<void>;
  deleteWasteRecord: (id: string) => Promise<void>;
}

export interface HACCPSlice {
  pccs: PCC[];
  haccpLogs: HACCPLog[];
  haccpTasks: HACCPTask[];
  haccpTaskCompletions: HACCPTaskCompletion[];
  haccpTimers: HACCPTimer[];
  setPCCs: (pccs: PCC[]) => void;
  setHACCPLogs: (logs: HACCPLog[]) => void;
  setHACCPTasks: (tasks: HACCPTask[]) => void;
  setHACCPTaskCompletions: (completions: HACCPTaskCompletion[]) => void;
  setHACCPTimers: (timers: HACCPTimer[]) => void;
  addPCC: (pcc: PCC) => void;
  updatePCC: (pcc: PCC) => void;
  deletePCC: (id: string) => void;
  addHACCPLog: (log: HACCPLog) => void;
  addHACCPTask: (task: HACCPTask) => void;
  updateHACCPTask: (task: HACCPTask) => void;
  deleteHACCPTask: (id: string) => void;
  completeHACCPTask: (completion: HACCPTaskCompletion) => void;
  addHACCPTimer: (timer: HACCPTimer) => void;
  updateHACCPTimer: (timer: HACCPTimer) => void;
  deleteHACCPTimer: (id: string) => void;
}

export interface InventorySlice {
  inventory: InventoryItem[];
  setInventory: (items: InventoryItem[]) => void;
  addInventoryItem: (item: InventoryItem) => Promise<void>;
  updateInventoryItem: (item: InventoryItem) => Promise<void>;
  addBatch: (
    itemId: string,
    batch: Partial<IngredientBatch>,
    standaloneData?: { name: string; unit: any; category: any; costPerUnit: number }
  ) => Promise<void>;
  consumeStock: (itemId: string, quantity: number) => Promise<void>;
}

export interface AnalyticsSlice {
  calculateMenuAnalytics: (startDate: string, endDate: string) => Promise<MenuItemAnalytics[]>;
}

export interface IntegrationSlice {
  integrations: Integration[];
  setIntegrations: (integrations: Integration[]) => void;
  connectIntegration: (id: string) => Promise<void>;
  disconnectIntegration: (id: string) => Promise<void>;
}

export interface OutletSlice {
  outlets: import('@/types').Outlet[];
  activeOutletId: string | null;
  setOutlets: (outlets: import('@/types').Outlet[]) => void;
  addOutlet: (outlet: import('@/types').Outlet) => Promise<void>;
  updateOutlet: (id: string, updates: Partial<import('@/types').Outlet>) => Promise<void>;
  setActiveOutletId: (id: string | null) => void;
  deleteOutlet: (id: string) => Promise<void>;
  toggleOutletActive: (id: string) => Promise<void>;
  getOutlet: (id: string) => import('@/types').Outlet | undefined;
}
export interface AuthSlice {
  currentUser: import('@/types').User | null;
  setCurrentUser: (user: import('@/types').User | null) => void;
}

// Settings Interface
export interface AppSettings {
  theme: 'light' | 'dark';
  language: 'es' | 'en';
  currency: 'EUR' | 'USD';
  businessType: 'HOTEL' | 'RESTAURANT';
}

export interface AppState
  extends
    IngredientSlice,
    EventSlice,
    ProductionSlice,
    StaffSlice,
    RecipeSlice,
    MenuSlice,
    PurchaseSlice,
    WasteSlice,
    HACCPSlice,
    AnalyticsSlice,
    OutletSlice,
    HospitalitySlice,
    NotificationSlice,
    IntegrationSlice,
    AuthSlice,
    InventorySlice {
  // activeOutletId is inherited from OutletSlice
  setActiveOutletId: (id: string | null) => void;

  // Global Settings
  settings: AppSettings;
  setSettings: (settings: Partial<AppSettings>) => void;
}
