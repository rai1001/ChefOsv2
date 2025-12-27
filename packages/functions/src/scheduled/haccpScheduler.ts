import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import PDFDocument = require("pdfkit");
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

/**
 * Scheduled function to generate monthly HACCP compliance report.
 * Runs on the 1st of every month at 01:00 AM.
 */
export const generateMonthlyHACCPReport = functions.pubsub
    .schedule("0 1 1 * *")
    .timeZone("Europe/Madrid")
    .onRun(async (context) => {
        const db = admin.firestore();
        const storage = admin.storage();

        // 1. Define previous month range
        const now = new Date();
        const prevMonth = subMonths(now, 1);
        const startDate = startOfMonth(prevMonth);
        const endDate = endOfMonth(prevMonth);

        const monthLabel = format(prevMonth, "yyyy_MM");
        const monthPretty = format(prevMonth, "MMMM yyyy");

        // 2. Fetch all Outlets
        const outletsSnap = await db.collection("outlets").get();

        for (const outletDoc of outletsSnap.docs) {
            const outletId = outletDoc.id;
            const outletName = outletDoc.data().name || outletId;

            try {
                // 3. Fetch Logs and Completions
                const logsSnap = await db.collection("haccpLogs")
                    .where("outletId", "==", outletId)
                    .where("timestamp", ">=", startDate.toISOString())
                    .where("timestamp", "<=", endDate.toISOString())
                    .get();

                const completionsSnap = await db.collection("haccpTaskCompletions")
                    .where("outletId", "==", outletId)
                    .where("completedAt", ">=", startDate.toISOString())
                    .where("completedAt", "<=", endDate.toISOString())
                    .get();

                if (logsSnap.empty && completionsSnap.empty) {
                    console.log(`No HACCP data for outlet ${outletName} in ${monthPretty}. Skipping report.`);
                    continue;
                }

                // 4. Generate PDF using PDFKit
                const doc = new PDFDocument();
                const buffers: any[] = [];
                doc.on("data", buffers.push.bind(buffers));

                // PDF Content
                doc.fontSize(20).text("REPORTE MENSUAL HACCP", { align: "center" });
                doc.fontSize(12).text(`Establecimiento: ${outletName}`, { align: "center" });
                doc.text(`Periodo: ${monthPretty}`, { align: "center" });
                doc.moveDown();

                doc.fontSize(16).text("1. Registros de Puntos Críticos (PCC)");
                logsSnap.docs.forEach(d => {
                    const l = d.data();
                    doc.fontSize(10).text(`${format(new Date(l.timestamp), "dd/MM HH:mm")} - ${l.pccId}: ${l.value}°C (${l.status})`);
                });
                doc.moveDown();

                doc.fontSize(16).text("2. Tareas de Higiene Completadas");
                completionsSnap.docs.forEach(d => {
                    const c = d.data();
                    doc.fontSize(10).text(`${format(new Date(c.completedAt), "dd/MM")} - Task ID: ${c.taskId} - Por: ${c.completedBy}`);
                });

                doc.moveDown();
                doc.fontSize(10).text("--- Fin del Reporte ---", { align: "center" });
                doc.text(`Generado automáticamente el ${format(now, "dd/MM/yyyy HH:mm")}`, { align: "center" });

                doc.end();

                // 5. Upload to Firebase Storage
                const pdfBuffer = Buffer.concat(await new Promise<any[]>((resolve) => doc.on("end", () => resolve(buffers))));
                const filePath = `reports/haccp/${outletId}/${monthLabel}_report.pdf`;
                const file = storage.bucket().file(filePath);

                await file.save(pdfBuffer, {
                    metadata: { contentType: "application/pdf" },
                });

                // 6. Save Report Reference in Firestore
                const [url] = await file.getSignedUrl({
                    action: 'read',
                    expires: '03-01-2500' // Permanent-ish link for internal use
                });

                await db.collection("haccpReports").add({
                    outletId,
                    month: monthLabel,
                    url,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    type: "AUTOMATIC"
                });

                console.log(`Report generated and saved for ${outletName} in ${monthLabel}`);
            } catch (error) {
                console.error(`Error generating HACCP report for outlet ${outletId}:`, error);
            }
        }
    });
