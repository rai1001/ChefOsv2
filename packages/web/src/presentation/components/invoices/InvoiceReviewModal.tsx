import React, { useState } from 'react';
import { Check, X, AlertTriangle, Loader2 } from 'lucide-react';

interface InvoiceReviewModalProps {
  invoice: {
    id: string;
    parsedData: {
      supplierName: string;
      totalAmount: number;
      invoiceDate: string;
    };
    matchedItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      ingredientId: string | null;
      matchType: 'exact' | 'fuzzy' | 'none';
      needsReview: boolean;
      potentialMatches?: Array<{ id: string; name: string }>;
    }>;
    confidence: number;
    processorUsed: string;
  };
  onConfirm: (corrections: any[]) => Promise<void>;
  onCancel: () => void;
}

export const InvoiceReviewModal: React.FC<InvoiceReviewModalProps> = ({
  invoice,
  onConfirm,
  onCancel,
}) => {
  const [corrections, setCorrections] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCorrection = (itemIndex: number, ingredientId: string) => {
    setCorrections((prev) => ({ ...prev, [itemIndex]: ingredientId }));
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const formattedCorrections = Object.entries(corrections).map(([idx, ingId]) => {
        const item = invoice.matchedItems[parseInt(idx)];
        if (!item) throw new Error(`Item at index ${idx} not found`);
        return {
          itemIndex: parseInt(idx),
          correctedIngredientId: ingId,
          originalDescription: item.description,
        };
      });
      await onConfirm(formattedCorrections);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-black/40">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                Revisar Factura
              </h3>
              <p className="text-slate-400 text-sm mt-1">
                {invoice.parsedData.supplierName} • {invoice.parsedData.invoiceDate}
              </p>
              <div className="flex gap-2 mt-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    invoice.confidence > 0.9
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : invoice.confidence > 0.75
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  Confidence: {Math.round(invoice.confidence * 100)}%
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                  Procesador: {invoice.processorUsed}
                </span>
              </div>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full">
              <X className="text-slate-400" size={20} />
            </button>
          </div>
        </div>

        {/* Items Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-left">
                <th className="pb-3 text-xs font-bold text-slate-500 uppercase">Estado</th>
                <th className="pb-3 text-xs font-bold text-slate-500 uppercase">Producto</th>
                <th className="pb-3 text-xs font-bold text-slate-500 uppercase">Cant.</th>
                <th className="pb-3 text-xs font-bold text-slate-500 uppercase">€/ud</th>
                <th className="pb-3 text-xs font-bold text-slate-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.matchedItems.map((item, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3">
                    {item.matchType === 'exact' && !item.needsReview ? (
                      <Check className="text-emerald-400" size={20} />
                    ) : item.matchType === 'fuzzy' ? (
                      <AlertTriangle className="text-amber-400" size={20} />
                    ) : (
                      <X className="text-red-400" size={20} />
                    )}
                  </td>
                  <td className="py-3">
                    <div className="text-sm text-white">{item.description}</div>
                    {item.needsReview && (
                      <select
                        className="mt-1 text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-slate-300 w-full max-w-xs"
                        onChange={(e) => handleCorrection(idx, e.target.value)}
                        value={corrections[idx] || ''}
                      >
                        <option value="">Seleccionar ingrediente...</option>
                        {item.potentialMatches?.map((match) => (
                          <option key={match.id} value={match.id}>
                            {match.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="py-3 text-sm text-slate-300">{item.quantity}</td>
                  <td className="py-3 text-sm text-slate-300">{item.unitPrice}€</td>
                  <td className="py-3 text-sm font-bold text-emerald-400">{item.totalPrice}€</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-black/40 flex justify-between items-center">
          <div className="text-sm text-slate-400">
            Total:{' '}
            <span className="text-2xl font-bold text-white">{invoice.parsedData.totalAmount}€</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
              Confirmar y Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
