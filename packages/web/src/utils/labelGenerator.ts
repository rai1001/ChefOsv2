import jsPDF from 'jspdf';
import QRCode from 'qrcode'; // Requires 'npm install qrcode @types/qrcode'
import { format } from 'date-fns';

export interface LabelData {
    title: string;
    type: string;
    productionDate: string; // YYYY-MM-DD
    expiryDate: string; // YYYY-MM-DD
    batchNumber: string;
    quantity: string;
    user: string; // Chef/User name
    allergens?: string[];
    width?: number; // mm
    height?: number; // mm
}

export const generateLabelPDF = async (data: LabelData): Promise<Blob> => {
    // 1. Setup Document (Dynamic dimensions)
    const w = data.width || 50;
    const h = data.height || 30;

    const doc = new jsPDF({
        orientation: w > h ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [w, h]
    });

    // Typography
    doc.setFont("helvetica", "bold");

    // Divider Line (Header)
    const headerHeight = Math.max(4, h * 0.15);
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(0, headerHeight, w, headerHeight);

    // Header Text (Type)
    doc.setFontSize(Math.min(8, headerHeight * 1.5));
    doc.text(data.type.toUpperCase(), w / 2, headerHeight * 0.75, { align: 'center' });

    // --- Product Name ---
    doc.setFontSize(Math.min(10, w / 4));
    const titleLines = doc.splitTextToSize(data.title.toUpperCase(), w - 4);
    // Limit lines based on height
    const maxTitleLines = h > 40 ? 3 : 2;
    const safeTitle = titleLines.length > maxTitleLines ? [...titleLines.slice(0, maxTitleLines - 1), titleLines[maxTitleLines - 1].replace(/.$/, '...')] : titleLines;
    doc.text(safeTitle, w / 2, headerHeight + 3, { align: 'center', baseline: 'top' });

    // --- Grid Dates ---
    const fontSize = Math.min(8, h / 5); // Increased from h/8
    doc.setFontSize(fontSize);
    const dateYStart = h * 0.55;
    const lineSpacing = fontSize * 0.9;

    // Prep Date
    doc.text("ELAB:", 2, dateYStart);
    doc.setFont("helvetica", "bold");
    doc.text(format(new Date(data.productionDate), 'dd/MM/yy'), 2 + (fontSize * 1.8), dateYStart);

    // Exp Date (Highlight - even larger if possible)
    const expFontSize = fontSize * 1.2;
    doc.setFontSize(expFontSize);
    doc.text("EXP:", 2, dateYStart + lineSpacing + 1);
    doc.setFont("helvetica", "bold");
    doc.text(format(new Date(data.expiryDate), 'dd/MM/yy'), 2 + (fontSize * 1.8), dateYStart + lineSpacing + 1);

    // --- Meta Info ---
    doc.setFontSize(Math.min(5, fontSize * 0.8));
    doc.text(`LOTE: ${data.batchNumber.slice(-6)}`, 2, h - 4);
    doc.text(`CANT: ${data.quantity}`, 2, h - 2);

    // --- QR Code ---
    const qrSize = Math.min(12, w * 0.3, h * 0.4);
    const qrData = JSON.stringify({
        id: data.batchNumber,
        n: data.title,
        e: data.expiryDate
    });

    try {
        const qrUrl = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: 'L',
            margin: 0,
            width: 100
        });

        // Add QR to PDF (Right side, centered vertically in the bottom half)
        doc.addImage(qrUrl, 'PNG', w - qrSize - 2, h - qrSize - 2, qrSize, qrSize);

    } catch (err) {
        console.error("QR Gen Error", err);
    }

    // --- Footer ---
    doc.setFontSize(Math.min(4, fontSize * 0.6));
    doc.text(`CHEF: ${data.user.slice(0, 10).toUpperCase()}`, w / 2, h - 1, { align: 'center' });

    return doc.output('blob');
};

export const printBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = url;
    document.body.appendChild(iframe);

    iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(url);
        }, 1000);
    };
};
