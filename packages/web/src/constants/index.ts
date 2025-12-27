/**
 * Application Constants
 * Centralized location for magic numbers and configuration values
 */

// Time Constants
export const TIME = {
    MS_PER_SECOND: 1000,
    MS_PER_MINUTE: 60 * 1000,
    MS_PER_HOUR: 60 * 60 * 1000,
    MS_PER_DAY: 24 * 60 * 60 * 1000,
    MS_PER_WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

// Inventory Constants
export const INVENTORY = {
    DEFAULT_EXPIRY_DAYS: 30,
    EXPIRING_SOON_DAYS: 7,
    MIN_STOCK_WARNING_THRESHOLD: 0.2, // 20% of min stock
} as const;

// Scheduler Constants
export const SCHEDULER = {
    MAX_CONSECUTIVE_WORK_DAYS: 6,
    MIN_DAYS_OFF_PER_28_DAYS: 8,
    MIN_CONSECUTIVE_DAYS_OFF: 2,
    PLANNING_WINDOW_DAYS: 28,
} as const;

// Excel Import Constants
export const EXCEL_IMPORT = {
    MAX_HEADER_SEARCH_ROWS: 20,
    DEFAULT_UNIT: 'kg',
} as const;

// HACCP Constants
export const HACCP = {
    TEMP_CRITICAL_LOW: 0,
    TEMP_CRITICAL_HIGH: 5,
    LOG_RETENTION_DAYS: 90,
} as const;
