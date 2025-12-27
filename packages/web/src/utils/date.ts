export const normalizeDate = (date: any): string => {
    if (!date) return '';
    try {
        // If it's a string, attempt to extract the YYYY-MM-DD part directly
        if (typeof date === 'string') {
            const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
            if (match) return match[0];

            // Handle DD/MM/YYYY or D/M/YYYY
            if (date.includes('/')) {
                const parts = date.split('/');
                if (parts.length === 3) {
                    const day = parts[0]!.trim().padStart(2, '0');
                    const month = parts[1]!.trim().padStart(2, '0');
                    const yearRaw = parts[2]!.trim();
                    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
                    if (Number(day) <= 31 && Number(month) <= 12) {
                        return `${year}-${month}-${day}`;
                    }
                }
            }

            // Fallback for other string formats
            const d = new Date(date);
            if (isNaN(d.getTime())) return '';
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // Handle Firestore Timestamp
        if (date && typeof date === 'object' && 'seconds' in date) {
            const d = new Date(date.seconds * 1000);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

        // Handle Number (Excel Serial Date)
        if (typeof date === 'number') {
            const d = new Date(Math.round((date - 25569) * 86400 * 1000));
            if (isNaN(d.getTime())) return '';
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // Handle Date object
        if (date instanceof Date) {
            if (isNaN(date.getTime())) return '';
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        return '';
    } catch (e) {
        console.warn('Error normalizing date:', date);
        return '';
    }
};
