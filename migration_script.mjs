
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIGURATION
const SERVICE_ACCOUNT_PATH = './CulinaryOs-main/service-account.json';
const DATA_DIR = './CulinaryOs-main/data_export';
const TARGET_PROJECT_ID = 'chefosv2';

// Check service account
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`❌ Service account not found at ${SERVICE_ACCOUNT_PATH}`);
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

// Initialize Firebase Admin for TARGET project
// Note: We use the legacy service account but override the project ID.
// This might fail if the service account doesn't have permissions on the new project.
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: TARGET_PROJECT_ID
});

const db = admin.firestore();

async function migrateStaff() {
    console.log('👥 Migrating staff...');
    const staffData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'staff.json'), 'utf8'));
    for (const employee of staffData) {
        const id = employee._id || employee.id;
        const v2Employee = {
            id,
            name: employee.name,
            role: employee.role,
            vacationDates: employee.vacationDates || [],
            active: true,
            outletId: employee.outletId || 'default'
        };
        await db.collection('employees').doc(id).set(v2Employee);
        console.log(`  ✅ Migrated: ${v2Employee.name}`);
    }
}

async function migrateEvents() {
    console.log('📅 Migrating events...');
    const eventsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'events.json'), 'utf8'));
    const batch = db.batch();
    let count = 0;

    // Process in batches of 400 (Firestore limit is 500)
    for (const event of eventsData) {
        const id = event._id || event.id;
        const v2Event = {
            id,
            name: event.name,
            date: event.date,
            pax: event.pax || 0,
            type: event.type || 'Otros',
            notes: event.notes || '',
            status: event.status || 'confirmed',
            outletId: event.outletId || 'default'
        };
        const docRef = db.collection('events').doc(id);
        batch.set(docRef, v2Event);
        count++;

        if (count % 400 === 0) {
            await batch.commit();
            console.log(`  📦 Committed ${count} events...`);
        }
    }
    await batch.commit();
    console.log(`  ✅ Finished migrating ${count} events.`);
}

async function migrateSchedule() {
    console.log('🗓️ Migrating schedule (shifts)...');
    const scheduleData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'schedule.json'), 'utf8'));
    let shiftCount = 0;
    const batch = db.batch();

    for (const monthDoc of scheduleData) {
        if (monthDoc.shifts && Array.isArray(monthDoc.shifts)) {
            for (const shift of monthDoc.shifts) {
                const shiftId = `${shift.date}_${shift.employeeId}_${shift.type}`;
                const v2Shift = {
                    id: shiftId,
                    date: shift.date,
                    employeeId: shift.employeeId,
                    type: shift.type,
                    outletId: monthDoc.outletId || 'default'
                };
                const docRef = db.collection('shifts').doc(shiftId);
                batch.set(docRef, v2Shift);
                shiftCount++;

                if (shiftCount % 400 === 0) {
                    await batch.commit();
                    console.log(`  📦 Committed ${shiftCount} shifts...`);
                }
            }
        }
    }
    await batch.commit();
    console.log(`  ✅ Finished migrating ${shiftCount} shifts.`);
}

async function main() {
    try {
        await migrateStaff();
        await migrateEvents();
        await migrateSchedule();
        console.log('\n✨ Migration completed successfully!');
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        if (error.message.includes('permission_denied')) {
            console.error('>> Suggestion: The legacy service account does not have access to the new project.');
            console.error('>> Please provide a service account JSON for project "chefosv2".');
        }
    }
}

main();
