import { SCANNER, ALLERGEN_MAP } from '../constants/scanner';
import type { NutritionalInfo } from '@/types';

export interface ProductLookupResult {
    found: boolean;
    barcode: string;
    name?: string;
    brand?: string;
    category?: string;
    allergens?: string[];
    nutritionalInfo?: NutritionalInfo;
    imageUrl?: string;
}

interface CachedProduct extends ProductLookupResult {
    cachedAt: string;
}

/**
 * Product cache in localStorage
 */
class ProductCache {
    private getCache(): Map<string, CachedProduct> {
        try {
            const data = localStorage.getItem(SCANNER.CACHE.STORAGE_KEY);
            if (!data) return new Map();
            return new Map(JSON.parse(data));
        } catch {
            return new Map();
        }
    }

    private saveCache(cache: Map<string, CachedProduct>): void {
        try {
            localStorage.setItem(SCANNER.CACHE.STORAGE_KEY, JSON.stringify([...cache]));
        } catch (error) {
            console.warn('Failed to save product cache:', error);
        }
    }

    get(barcode: string): ProductLookupResult | null {
        const cache = this.getCache();
        const cached = cache.get(barcode);

        if (!cached) return null;

        // Check if cache is expired
        const cachedDate = new Date(cached.cachedAt);
        const expiryDate = new Date(cachedDate.getTime() + SCANNER.CACHE.EXPIRY_DAYS * 24 * 60 * 60 * 1000);

        if (new Date() > expiryDate) {
            cache.delete(barcode);
            this.saveCache(cache);
            return null;
        }

        return cached;
    }

    set(barcode: string, product: ProductLookupResult): void {
        const cache = this.getCache();

        // Limit cache size
        if (cache.size >= SCANNER.CACHE.MAX_PRODUCTS) {
            // Remove oldest entry
            const firstKey = cache.keys().next().value;
            if (firstKey) cache.delete(firstKey);
        }

        cache.set(barcode, {
            ...product,
            cachedAt: new Date().toISOString(),
        });

        this.saveCache(cache);
    }
}

const productCache = new ProductCache();

/**
 * Lookup product information by barcode using Open Food Facts API
 */
export async function lookupProductByBarcode(barcode: string): Promise<ProductLookupResult> {
    // Check cache first
    const cached = productCache.get(barcode);
    if (cached) {
        console.log('Product found in cache:', barcode);
        return cached;
    }

    // Fetch from API
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SCANNER.API.TIMEOUT);

        const response = await fetch(`${SCANNER.API.OPEN_FOOD_FACTS_URL}/${barcode}.json`, {
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return { found: false, barcode };
        }

        const data = await response.json();

        if (data.status === 0 || !data.product) {
            return { found: false, barcode };
        }

        const product = data.product;

        // Map allergens
        const allergens: string[] = [];
        if (product.allergens_tags && Array.isArray(product.allergens_tags)) {
            product.allergens_tags.forEach((tag: string) => {
                const mapped = ALLERGEN_MAP[tag];
                if (mapped) allergens.push(mapped);
            });
        }

        // Extract nutritional info
        let nutritionalInfo: NutritionalInfo | undefined;
        if (product.nutriments) {
            const n = product.nutriments;
            nutritionalInfo = {
                calories: n['energy-kcal_100g'] || n.energy_100g / 4.184 || 0,
                protein: n.proteins_100g || 0,
                carbs: n.carbohydrates_100g || 0,
                fat: n.fat_100g || 0,
            };
        }

        const result: ProductLookupResult = {
            found: true,
            barcode,
            name: product.product_name || product.product_name_es || product.product_name_en || undefined,
            brand: product.brands || undefined,
            category: product.categories || undefined,
            allergens: allergens.length > 0 ? allergens : undefined,
            nutritionalInfo,
            imageUrl: product.image_url || product.image_front_url || undefined,
        };

        // Cache the result
        productCache.set(barcode, result);

        return result;
    } catch (error) {
        console.error('Error looking up product:', error);
        return { found: false, barcode };
    }
}

/**
 * Clear the product cache
 */
export function clearProductCache(): void {
    try {
        localStorage.removeItem(SCANNER.CACHE.STORAGE_KEY);
    } catch (error) {
        console.warn('Failed to clear product cache:', error);
    }
}
