/**
 * Scanner Configuration Constants
 * Settings for barcode scanning and OCR functionality
 */

export const SCANNER = {
    BARCODE: {
        // Supported barcode formats
        FORMATS: ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'CODE_128', 'QR_CODE'],
        // Frames per second for scanning
        FPS: 10,
        // Camera aspect ratio
        ASPECT_RATIO: 1.333, // 4:3
        // Scanning box dimensions (% of viewport)
        SCAN_BOX_WIDTH: 250,
        SCAN_BOX_HEIGHT: 250,
    },

    OCR: {
        // Tesseract language
        LANGUAGE: 'eng',
        // Minimum confidence threshold for OCR results (0-100)
        CONFIDENCE_THRESHOLD: 60,
        // Common date patterns to match
        DATE_PATTERNS: [
            /(\d{2})\/(\d{2})\/(\d{4})/,  // DD/MM/YYYY
            /(\d{2})-(\d{2})-(\d{2,4})/,  // DD-MM-YY(YY)
            /(\d{2})\.(\d{2})\.(\d{4})/,  // DD.MM.YYYY
            /(\d{4})\/(\d{2})\/(\d{2})/,  // YYYY/MM/DD
            /(\d{2})\s+(\d{2})\s+(\d{4})/,  // DD MM YYYY (spaces)
        ],
        // Image preprocessing settings
        IMAGE_SCALE: 2, // Scale up for better OCR
        GRAYSCALE: true,
    },

    CACHE: {
        // Maximum number of products to cache
        MAX_PRODUCTS: 100,
        // Cache expiry in days
        EXPIRY_DAYS: 30,
        // LocalStorage key
        STORAGE_KEY: 'scanned-products-cache',
    },

    API: {
        // Open Food Facts API endpoint
        OPEN_FOOD_FACTS_URL: 'https://world.openfoodfacts.org/api/v0/product',
        // Request timeout in milliseconds
        TIMEOUT: 5000,
    },

    NOTIFICATIONS: {
        // Days before expiry to show warnings
        WARNING_DAYS: [7, 3, 1, 0], // 1 week, 3 days, tomorrow, today
        // Max notifications to show at once
        MAX_VISIBLE: 5,
    },
} as const;

export const ALLERGEN_MAP: Record<string, string> = {
    'en:gluten': 'Gluten',
    'en:milk': 'Leche',
    'en:eggs': 'Huevos',
    'en:fish': 'Pescado',
    'en:peanuts': 'Cacahuetes',
    'en:soybeans': 'Soja',
    'en:nuts': 'Frutos de cáscara',
    'en:celery': 'Apio',
    'en:mustard': 'Mostaza',
    'en:sesame-seeds': 'Sésamo',
    'en:sulphur-dioxide-and-sulphites': 'Sulfitos',
    'en:lupin': 'Altramuces',
    'en:molluscs': 'Moluscos',
    'en:crustaceans': 'Crustáceos',
};
