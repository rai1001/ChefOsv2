import { db } from '@/config/firebase';
import { collection, writeBatch, doc, getDocs, query, where, Timestamp, orderBy } from 'firebase/firestore';
import type { OccupancyData } from '@/types/occupancy';

const COLLECTION_NAME = 'occupancy';

export function parseOccupancyImport(rawData: Record<string, unknown>[]): OccupancyData[] {
    const results: OccupancyData[] = [];

    rawData.forEach((row) => {
        // --- KEY NORMALIZATION ---
        const normalizedRow: Record<string, unknown> = {};
        Object.keys(row).forEach(key => {
            const normalizedKey = key.toLowerCase().trim();
            normalizedRow[normalizedKey] = row[key];
        });

        // Handle various date formats and column names
        const rawDate = normalizedRow.fecha || normalizedRow.date;
        if (!rawDate) return;

        let date: Date;
        if (rawDate instanceof Date) {
            date = rawDate;
        } else if (typeof rawDate === 'number' && rawDate > 30000 && rawDate < 60000) {
            // Excel serial date (e.g. 45281)
            date = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
        } else {
            const dateStr = String(rawDate).trim();
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    const [d, m, y] = parts.map(Number);
                    if (typeof d === 'number' && typeof m === 'number' && typeof y === 'number' &&
                        d > 0 && d <= 31 && m > 0 && m <= 12 && y > 1900) {
                        date = new Date(y, m - 1, d);
                    } else {
                        date = new Date(dateStr);
                    }
                } else {
                    date = new Date(dateStr);
                }
            } else {
                date = new Date(dateStr);
            }
        }

        if (!date || isNaN(date.getTime())) return;

        const totalRooms = Number(normalizedRow['habitaciones totales'] || normalizedRow['total rooms'] || normalizedRow.habitaciones || 0);
        const occupiedRooms = Number(normalizedRow['habitaciones ocupadas'] || normalizedRow['occupied rooms'] || normalizedRow.ocupadas || 0);
        const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
        const events = normalizedRow.eventos || normalizedRow.events ? String(normalizedRow.eventos || normalizedRow.events).split(',').map((s: string) => s.trim()) : [];

        // --- MULTI-MEAL DETECTION ---
        const breakfastPax = normalizedRow.desayunos || normalizedRow.breakfast;
        const lunchPax = normalizedRow.comidas || normalizedRow.lunch;
        const dinnerPax = normalizedRow.cenas || normalizedRow.dinner;

        const hasSpecificMeals = breakfastPax !== undefined || lunchPax !== undefined || dinnerPax !== undefined;

        if (hasSpecificMeals) {
            if (breakfastPax !== undefined && breakfastPax !== null) {
                results.push({
                    date, totalRooms, occupiedRooms, occupancyRate,
                    estimatedPax: Number(breakfastPax),
                    mealType: 'breakfast',
                    specialEvents: events
                });
            }
            if (lunchPax !== undefined && lunchPax !== null) {
                results.push({
                    date, totalRooms, occupiedRooms, occupancyRate,
                    estimatedPax: Number(lunchPax),
                    mealType: 'lunch',
                    specialEvents: events
                });
            }
            if (dinnerPax !== undefined && dinnerPax !== null) {
                results.push({
                    date, totalRooms, occupiedRooms, occupancyRate,
                    estimatedPax: Number(dinnerPax),
                    mealType: 'dinner',
                    specialEvents: events
                });
            }
        } else {
            const paxValue = normalizedRow.pax || normalizedRow.personas;
            results.push({
                date,
                totalRooms,
                occupiedRooms,
                occupancyRate,
                estimatedPax: Number(paxValue || (occupiedRooms * 2)),
                mealType: (String(normalizedRow['tipo comida'] || normalizedRow['meal type'] || 'breakfast')).toLowerCase() as 'breakfast' | 'lunch' | 'dinner',
                specialEvents: events
            });
        }
    });

    return results;
}

export async function saveOccupancyData(data: OccupancyData[], externalBatch?: ReturnType<typeof writeBatch>): Promise<void> {
    const batch = externalBatch || writeBatch(db);

    console.log(`DEBUG: Starting save of ${data.length} records`);
    data.forEach(item => {
        const { date, mealType, ...rest } = item;
        const dateStr = date.toISOString().slice(0, 10);
        const docId = `${dateStr}_${mealType}`;
        const docRef = doc(db, COLLECTION_NAME, docId);

        const ms = date.getTime();
        const firestoreTimestamp = Timestamp.fromMillis(ms);

        batch.set(docRef, {
            ...rest,
            mealType,
            date: firestoreTimestamp,
            updatedAt: Timestamp.now()
        }, { merge: true });
    });

    if (!externalBatch) {
        await batch.commit();
        console.log("DEBUG: Batch commit successful");
    }
}

export async function getOccupancyForecast(
    startDate: Date,
    endDate: Date
): Promise<OccupancyData[]> {
    const q = query(
        collection(db, COLLECTION_NAME),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            date: data.date.toDate()
        } as OccupancyData;
    });
}
