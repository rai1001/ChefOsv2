import React, { useState } from 'react';
import { scanInvoiceImage } from '@/services/geminiService';
import type { ProcessedInvoice } from '@/types';
import { Upload, Loader2, FileText, CheckCircle } from 'lucide-react';

interface InvoiceUploaderProps {
    onScanComplete?: (data: ProcessedInvoice) => void;
}

export const InvoiceUploader: React.FC<InvoiceUploaderProps> = ({ onScanComplete }) => {
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<ProcessedInvoice | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            // Convert to Base64
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                    const res = reader.result as string;
                    // Remove data url prefix
                    const base64Content = res.split(',')[1];
                    if (base64Content) {
                        resolve(base64Content);
                    } else {
                        reject(new Error('Invalid file format'));
                    }
                };
                reader.onerror = error => reject(error);
            });

            setUploading(false);
            setProcessing(true);

            // Call Client-Side Gemini
            const response = await scanInvoiceImage(base64Data);

            if (response.success && response.data) {
                // Ensure data matches ProcessedInvoice type or map it
                const aiData = response.data;
                const processed: ProcessedInvoice = {
                    supplierName: aiData.supplierName || 'Desconocido',
                    date: aiData.date || new Date().toISOString(),
                    totalCost: Number(aiData.totalCost || aiData.total || 0),
                    items: Array.isArray(aiData.items) ? aiData.items.map((item: { description?: string; name?: string; quantity?: number; unitPrice?: number; price?: number; total?: number }) => ({
                        description: item.description || item.name || 'Item',
                        quantity: Number(item.quantity || 1),
                        unitPrice: Number(item.unitPrice || item.price || 0),
                        total: Number(item.total || 0)
                    })) : []
                };
                setResult(processed);
            } else {
                throw new Error(response.error || 'No se pudo leer la factura');
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error procesando factura');
        } finally {
            setUploading(false);
            setProcessing(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                <FileText className="text-emerald-600" />
                Escáner de Facturas (AI)
            </h2>

            <div className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors relative ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".jpg,.jpeg,.png,.webp"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploading || processing}
                />

                {processing ? (
                    <div className="animate-pulse flex flex-col items-center z-10">
                        <Loader2 className="w-12 h-12 text-emerald-500 mb-3 animate-spin" />
                        <span className="text-emerald-600 font-medium text-lg">Analizando factura...</span>
                        <span className="text-emerald-500/80 text-sm mt-1">Extrayendo datos con Gemini AI</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center z-10 text-center">
                        <Upload className={`w-12 h-12 mb-3 ${error ? 'text-red-400' : 'text-gray-400'}`} />
                        <span className="text-gray-600 font-medium text-lg">Arrastra o haz clic para subir</span>
                        <span className="text-sm text-gray-400 mt-1">Soporta JPG, PNG (las fotos claras funcionan mejor)</span>
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    {error}
                </div>
            )}

            {result && (
                <div className="mt-8 border rounded-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                    {/* Header */}
                    <div className="bg-emerald-50 p-4 border-b border-emerald-100 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-emerald-900">{result.supplierName}</h3>
                            <p className="text-emerald-700 text-sm">{new Date(result.date).toLocaleDateString()}</p>
                        </div>
                        <CheckCircle className="text-emerald-500 w-6 h-6" />
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 divide-x border-b">
                        <div className="p-4 text-center">
                            <span className="block text-xs uppercase tracking-wider text-gray-500">Items</span>
                            <span className="text-xl font-bold text-gray-800">{result.items.length}</span>
                        </div>
                        <div className="p-4 text-center">
                            <span className="block text-xs uppercase tracking-wider text-gray-500">Total</span>
                            <span className="text-xl font-bold text-emerald-600">{result.totalCost.toFixed(2)}€</span>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="overflow-x-auto max-h-60 overflow-y-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr className="text-left text-gray-500">
                                    <th className="px-4 py-2 font-medium">Descripción</th>
                                    <th className="px-4 py-2 font-medium text-right">Cant.</th>
                                    <th className="px-4 py-2 font-medium text-right">Precio</th>
                                    <th className="px-4 py-2 font-medium text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {result.items.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-gray-800">{item.description}</td>
                                        <td className="px-4 py-2 text-right text-gray-600">{item.quantity}</td>
                                        <td className="px-4 py-2 text-right text-gray-600">{item.unitPrice.toFixed(2)}€</td>
                                        <td className="px-4 py-2 text-right font-medium text-gray-800">{(item.quantity * item.unitPrice).toFixed(2)}€</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t">
                        <button
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                            onClick={() => setResult(null)}
                        >
                            Descartar
                        </button>
                        <button
                            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all text-sm font-bold flex items-center gap-2"
                            onClick={() => {
                                if (onScanComplete && result) {
                                    onScanComplete(result);
                                }
                                setResult(null);
                            }}
                        >
                            <FileText size={16} />
                            Crear Pedido
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

