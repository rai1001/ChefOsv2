
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIGURATION
const REPO_ROOT = path.resolve(__dirname, '../..');
const SERVICE_ACCOUNT_PATH = path.join(REPO_ROOT, 'chefosv2-firebase-adminsdk-fbsvc-26dc01131f.json');
const DATA_DIR = path.join(REPO_ROOT, 'CulinaryOs-main/data_export');
const TARGET_PROJECT_ID = 'chefosv2';

console.log('Repo Root:', REPO_ROOT);
console.log('Service Account Path:', SERVICE_ACCOUNT_PATH);
console.log('Data Dir:', DATA_DIR);

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`❌ Service account not found at ${SERVICE_ACCOUNT_PATH}`);
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: TARGET_PROJECT_ID
});

const db = admin.firestore();

async function migrateCollection(collectionName, v2CollectionName = collectionName) {
    console.log(`📂 Migrating ${collectionName}...`);
    const filePath = path.join(DATA_DIR, `${collectionName}.json`);
    if (!fs.existsSync(filePath)) {
        console.warn(`  ⚠️ Skip: ${filePath} not found.`);
        return;
    }

    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);

    if (!Array.isArray(data)) {
        console.warn(`  ⚠️ Skip: ${collectionName} data is not an array.`);
        return;
    }

    const total = data.length;
    console.log(`  Found ${total} items. Processing...`);

    for (let i = 0; i < total; i += 400) {
        const batch = db.batch();
        const chunk = data.slice(i, i + 400);

        for (const item of chunk) {
            const id = item._id || item.id;
            if (!id) {
                console.warn(`  ⚠️ No ID for item in ${collectionName}, skipping.`);
                continue;
            }
            // Clean up legacy fields if necessary
            const cleanedItem = { ...item };
            delete cleanedItem._id;
            if (!cleanedItem.id) cleanedItem.id = id;

            const docRef = db.collection(v2CollectionName).doc(id);
            batch.set(docRef, cleanedItem);
        }

        await batch.commit();
        console.log(`  📦 Committed ${Math.min(i + 400, total)}/${total} items...`);
    }
    console.log(`  ✅ Finished migrating ${collectionName}.`);
}

async function migrateSchedule() {
    console.log('🗓️ Migrating schedule (shifts)...');
    const filePath = path.join(DATA_DIR, 'schedule.json');
    if (!fs.existsSync(filePath)) return;

    const scheduleData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let shiftCount = 0;

    const allShifts = [];
    for (const monthDoc of scheduleData) {
        if (monthDoc.shifts && Array.isArray(monthDoc.shifts)) {
            for (const shift of monthDoc.shifts) {
                allShifts.push({
                    monthOutletId: monthDoc.outletId,
                    ...shift
                });
            }
        }
    }

    const total = allShifts.length;
    console.log(`  Found ${total} shifts. Processing...`);

    for (let i = 0; i < total; i += 400) {
        const batch = db.batch();
        const chunk = allShifts.slice(i, i + 400);

        for (const shift of chunk) {
            const shiftId = `${shift.date}_${shift.employeeId}_${shift.type}`;
            const v2Shift = {
                id: shiftId,
                date: shift.date,
                employeeId: shift.employeeId,
                type: shift.type,
                outletId: shift.monthOutletId || 'default'
            };
            const docRef = db.collection('shifts').doc(shiftId);
            batch.set(docRef, v2Shift);
        }

        await batch.commit();
        shiftCount += chunk.length;
        console.log(`  📦 Committed ${shiftCount}/${total} shifts...`);
    }
    console.log(`  ✅ Finished migrating shifts.`);
}

async function main() {
    try {
        // Staff/Employees
        await migrateCollection('staff', 'employees');

        // Events
        await migrateCollection('events');

        // Business Logic / Functionalities
        await migrateCollection('ingredients');
        await migrateCollection('recipes');
        await migrateCollection('fichasTecnicas');
        await migrateCollection('inventory');
        await migrateCollection('menus');
        await migrateCollection('outlets');
        await migrateCollection('suppliers');
        await migrateCollection('purchaseOrders');
        await migrateCollection('wasteRecords');

        // Schedule
        await migrateSchedule();

        console.log('\n✨ Full migration completed successfully!');
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error.stack);
    }
}

main();
