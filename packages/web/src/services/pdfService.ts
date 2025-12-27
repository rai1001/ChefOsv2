/**
 * @file src/services/pdfService.ts
 * @description Service for generating professional PDFs of Fichas Técnicas.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FichaTecnica } from '@/types';
import { format } from 'date-fns';

/**
 * Generates and downloads a PDF for a Ficha Técnica.
 */
export async function generarPDFFicha(ficha: FichaTecnica): Promise<void> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    // --- Header ---
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('FICHA TÉCNICA', margin, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`CulinaryOs - Sistema de Gestión Gastronómica`, margin, 25);

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 28, pageWidth - margin, 28);

    // --- Info General ---
    doc.setFontSize(16);
    doc.setTextColor(33, 33, 33);
    doc.text(ficha.nombre.toUpperCase(), margin, 40);

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Categoría: ${ficha.categoria}`, margin, 48);
    doc.text(`Porciones: ${ficha.porciones}`, margin, 54);
    doc.text(`Versión: ${ficha.version}`, pageWidth - 40, 48);
    doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth - 40, 54);

    // --- Tabla de Ingredientes ---
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.text('INGREDIENTES', margin, 68);

    const ingredientData = ficha.ingredientes.map(ing => [
        ing.nombre || 'Ingrediente Desconocido',
        ing.cantidad,
        ing.unidad,
        `${ing.costoUnitario?.toFixed(2) || '0.00'} €`,
        `${ing.costoTotal?.toFixed(2) || '0.00'} €`
    ]);

    autoTable(doc, {
        startY: 72,
        head: [['Ingrediente', 'Cantidad', 'Unidad', 'Costo Unit.', 'Costo Total']],
        body: ingredientData,
        theme: 'striped',
        headStyles: { fillColor: [60, 60, 60], textColor: 255 },
        margin: { left: margin, right: margin }
    });

    // --- Pasos de Preparación ---
    const finalYIngredients = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text('PASOS DE PREPARACIÓN', margin, finalYIngredients);

    let currentY = finalYIngredients + 7;
    doc.setFontSize(10);
    ficha.pasos.sort((a, b) => a.orden - b.orden).forEach((paso, index) => {
        const text = `${index + 1}. ${paso.descripcion}`;
        const lines = doc.splitTextToSize(text, pageWidth - (margin * 2));

        // Check for page overflow
        if (currentY + (lines.length * 5) > 270) {
            doc.addPage();
            currentY = 20;
        }

        doc.text(lines, margin, currentY);
        currentY += (lines.length * 6);
    });

    // --- Resumen de Costos y Margen ---
    if (currentY > 230) {
        doc.addPage();
        currentY = 20;
    } else {
        currentY += 10;
    }

    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 40, 'F');

    const boxY = currentY + 8;
    doc.setFontSize(12);
    doc.setTextColor(33, 33, 33);
    doc.text('ANÁLISIS FINANCIERO', margin + 5, boxY);

    doc.setFontSize(10);
    doc.text(`Costo Total Ingredientes:`, margin + 5, boxY + 10);
    doc.text(`${ficha.costos.ingredientes.toFixed(2)} €`, margin + 60, boxY + 10);

    doc.text(`Costo por Porción:`, margin + 5, boxY + 18);
    doc.text(`${ficha.costos.porPorcion.toFixed(2)} €`, margin + 60, boxY + 18);

    if (ficha.pricing?.precioVentaSugerido) {
        doc.setFontSize(11);
        doc.setTextColor(0, 100, 0); // Dark Green
        doc.text(`Precio de Venta Sugerido:`, margin + 110, boxY + 10);
        doc.text(`${ficha.pricing.precioVentaSugerido.toFixed(2)} €`, margin + 165, boxY + 10);

        const rentabilidad = ficha.pricing.margenBruto
            ? ((ficha.pricing.margenBruto / (ficha.pricing.precioVentaSugerido || 1)) * 100).toFixed(1)
            : '0';

        doc.text(`Rentabilidad Esperada:`, margin + 110, boxY + 18);
        doc.text(`${rentabilidad}%`, margin + 165, boxY + 18);
    }

    // --- Footer ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Página ${i} de ${pageCount} - Generado por CulinaryOs`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
        );
    }

    // --- Download ---
    doc.save(`Ficha_${ficha.nombre.replace(/\s+/g, '_')}_v${ficha.version}.pdf`);
}
