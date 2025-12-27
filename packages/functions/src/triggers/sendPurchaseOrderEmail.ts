import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';
import * as PDFDocument from 'pdfkit';

// Initialize Resend with API Key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789'); // Valid placeholder or env var

const generatePDF = (order: any, supplier: any, branchName: string): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });

        // Header
        doc.fontSize(20).text('PEDIDO DE COMPRA', { align: 'center' });
        doc.fontSize(12).text(order.orderNumber, { align: 'center' });
        doc.moveDown();

        // Details
        doc.fontSize(10).text(`Fecha: ${new Date().toLocaleDateString()}`, { align: 'right' });
        doc.text(`De: ${branchName}`, { align: 'right' });
        doc.moveDown();
        doc.text(`Para: ${supplier.name}`);
        if (supplier.email) doc.text(supplier.email);
        doc.moveDown();

        // Logistics
        doc.fontSize(12).text('Detalles de Entrega', { underline: true });
        doc.fontSize(10);
        if (order.deliveryDate) doc.text(`Fecha requerida: ${order.deliveryDate}`);
        if (order.deliveryWindow) doc.text(`Horario: ${order.deliveryWindow}`);
        if (order.deliveryAddress) doc.text(`Dirección: ${order.deliveryAddress}`);
        if (order.contactPerson) doc.text(`Contacto: ${order.contactPerson}`);
        if (order.deliveryNotes) doc.text(`Notas: ${order.deliveryNotes}`);
        doc.moveDown();

        // Items Table Header
        const startY = doc.y;
        doc.text('Producto', 50, startY, { width: 250 });
        doc.text('Cant', 300, startY, { width: 50, align: 'right' });
        doc.text('Costo', 350, startY, { width: 70, align: 'right' });
        doc.text('Total', 420, startY, { width: 80, align: 'right' });

        doc.moveTo(50, startY + 15).lineTo(500, startY + 15).stroke();
        doc.moveDown();

        // Items
        let currentY = doc.y + 10;
        order.items.forEach((item: any) => {
            const name = item.tempDescription || 'Ingrediente ' + item.ingredientId;
            const quantity = `${item.quantity} ${item.unit}`;
            const cost = `${(item.costPerUnit || 0).toFixed(2)}€`;
            const total = `${((item.quantity || 0) * (item.costPerUnit || 0)).toFixed(2)}€`;

            doc.text(name, 50, currentY, { width: 250 });
            doc.text(quantity, 300, currentY, { width: 50, align: 'right' });
            doc.text(cost, 350, currentY, { width: 70, align: 'right' });
            doc.text(total, 420, currentY, { width: 80, align: 'right' });

            currentY += 20; // Simple line height estimate
        });

        doc.moveTo(50, currentY + 5).lineTo(500, currentY + 5).stroke();

        // Total
        doc.fontSize(14).text(`TOTAL: ${(order.totalCost || 0).toFixed(2)}€`, 50, currentY + 20, { align: 'right' });

        doc.end();
    });
};

export const sendPurchaseOrderEmail = functions.firestore
    .document('purchaseOrders/{orderId}')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const previousData = change.before.data();

        // Only trigger when status changes to ORDERED
        if (newData.status === 'ORDERED' && previousData.status !== 'ORDERED') {
            console.log(`Processing order ${context.params.orderId} - Status changed to ORDERED`);

            try {
                // 1. Fetch Supplier Details
                const supplierDoc = await admin.firestore().collection('suppliers').doc(newData.supplierId).get();
                const supplier = supplierDoc.data();

                if (!supplier || !supplier.email) {
                    console.error('Supplier not found or has no email');
                    return;
                }

                // 2. Fetch Outlet Details (for sender info)
                const outletDoc = await admin.firestore().collection('outlets').doc(newData.outletId).get();
                const outlet = outletDoc.data();
                const branchName = outlet?.name || 'ChefOS Kitchen';

                // 3. Generate HTML Table for Items (kept for email body)
                const itemsHtml = newData.items.map((item: any) => `
                    <tr>
                        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; color: #334155; font-weight: 500;">
                            ${item.tempDescription || 'Ingrediente ' + item.ingredientId}
                            <br/><span style="font-size: 10px; color: #94a3b8; font-family: monospace;">ID: ${item.ingredientId}</span>
                        </td>
                        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: right; color: #0f172a; font-weight: 700;">
                            ${item.quantity} <span style="font-size: 11px; font-weight: 400; color: #64748b;">${item.unit}</span>
                        </td>
                        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: right; color: #64748b;">
                            ${(item.costPerUnit || 0).toFixed(2)}€
                        </td>
                        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: right; color: #0f172a; font-weight: 700;">
                            ${((item.quantity || 0) * (item.costPerUnit || 0)).toFixed(2)}€
                        </td>
                    </tr>
                `).join('');

                const emailHtml = `
                    <!DOCTYPE html>
                    <html>
                    <body style="background-color: #f8fafc; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                            <!-- Header -->
                            <div style="background-color: #0f172a; padding: 32px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: -0.025em;">PEDIDO DE COMPRA</h1>
                                <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">${newData.orderNumber}</p>
                            </div>

                            <!-- Info -->
                            <div style="padding: 32px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 32px;">
                                    <div style="flex: 1;">
                                        <p style="text-transform: uppercase; font-size: 10px; font-weight: 800; color: #64748b; margin: 0 0 8px 0; letter-spacing: 0.05em;">Para:</p>
                                        <p style="margin: 0; color: #0f172a; font-weight: 700;">${supplier.name}</p>
                                        ${supplier.email ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">${supplier.email}</p>` : ''}
                                    </div>
                                    <div style="flex: 1; text-align: right;">
                                        <p style="text-transform: uppercase; font-size: 10px; font-weight: 800; color: #64748b; margin: 0 0 8px 0; letter-spacing: 0.05em;">Desde:</p>
                                        <p style="margin: 0; color: #0f172a; font-weight: 700;">${branchName}</p>
                                        <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">${new Date().toLocaleDateString('es-ES')}</p>
                                    </div>
                                </div>

                                <!-- Logistics -->
                                <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 32px; border-left: 4px solid #6366f1;">
                                    <p style="margin: 0; font-size: 14px; color: #334155;">
                                        <strong>Fecha requerida de entrega:</strong> <span style="color: #6366f1;">${newData.deliveryDate || 'Lo antes posible'}</span>
                                    </p>
                                    ${newData.deliveryWindow ? `
                                        <p style="margin: 8px 0 0 0; font-size: 14px; color: #334155;">
                                            <strong>Horario de entrega:</strong> ${newData.deliveryWindow}
                                        </p>
                                    ` : ''}
                                    ${newData.deliveryAddress ? `
                                        <p style="margin: 8px 0 0 0; font-size: 14px; color: #334155;">
                                            <strong>Direcci&oacute;n de entrega:</strong> ${newData.deliveryAddress}
                                        </p>
                                    ` : ''}
                                    ${newData.contactPerson ? `
                                        <p style="margin: 8px 0 0 0; font-size: 14px; color: #334155;">
                                            <strong>Persona de contacto:</strong> ${newData.contactPerson}
                                        </p>
                                    ` : ''}
                                    
                                    ${newData.deliveryNotes ? `
                                        <div style="margin: 12px 0 0 0; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
                                            <p style="margin: 0; font-size: 13px; color: #64748b;">
                                                <strong>Instrucciones:</strong> ${newData.deliveryNotes}
                                            </p>
                                        </div>
                                    ` : ''}

                                    ${newData.logisticsNotes ? `
                                        <div style="margin: 8px 0 0 0;">
                                            <p style="margin: 0; font-size: 13px; color: #64748b;">
                                                <strong>Notas Log&iacute;sticas:</strong> ${newData.logisticsNotes}
                                            </p>
                                        </div>
                                    ` : ''}
                                </div>

                                <!-- Table -->
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr>
                                            <th style="text-align: left; font-size: 10px; text-transform: uppercase; color: #94a3b8; padding-bottom: 12px; border-bottom: 2px solid #f1f5f9;">PRODUCTO</th>
                                            <th style="text-align: right; font-size: 10px; text-transform: uppercase; color: #94a3b8; padding-bottom: 12px; border-bottom: 2px solid #f1f5f9;">CANT</th>
                                            <th style="text-align: right; font-size: 10px; text-transform: uppercase; color: #94a3b8; padding-bottom: 12px; border-bottom: 2px solid #f1f5f9;">COSTO</th>
                                            <th style="text-align: right; font-size: 10px; text-transform: uppercase; color: #94a3b8; padding-bottom: 12px; border-bottom: 2px solid #f1f5f9;">TOTAL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${itemsHtml}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colspan="3" style="text-align: right; padding: 24px 8px 0 0; font-weight: 700; color: #64748b; font-size: 14px;">TOTAL DEL PEDIDO:</td>
                                            <td style="text-align: right; padding: 24px 8px 0 0; font-weight: 800; color: #0f172a; font-size: 18px;">${(newData.totalCost || 0).toFixed(2)}€</td>
                                        </tr>
                                    </tfoot>
                                </table>

                                <!-- Footer -->
                                <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #f1f5f9; text-align: center;">
                                    <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                                        Este es un pedido automático generado a través de <strong>CulinaryOS</strong>.
                                        Si tiene alguna duda, por favor contacte directamente con el punto de venta.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                `;

                // 4. Generate PDF
                const pdfBuffer = await generatePDF(newData, supplier, branchName);

                // 5. Send Email via Resend with Attachment
                await resend.emails.send({
                    from: 'ChefOS <orders@chefos.app>',
                    to: supplier.email,
                    subject: `Pedido ${newData.orderNumber} - ${branchName}`,
                    html: emailHtml,
                    attachments: [
                        {
                            filename: `Pedido_${newData.orderNumber}.pdf`,
                            content: pdfBuffer // Buffer works directly
                        }
                    ]
                });

                console.log(`Email sent to ${supplier.email} for order ${newData.orderNumber} with PDF`);

                // 6. Update Order with sentAt timestamp
                await change.after.ref.update({
                    sentAt: new Date().toISOString()
                });

            } catch (error) {
                console.error('Error sending email:', error);
            }
        }
    });
