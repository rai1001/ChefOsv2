import React, { useState, useEffect } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { StickyNote, Save, Loader2, Check } from 'lucide-react';

export const PurchasingNotesWidget: React.FC = () => {
    const { purchasingNotes, updatePurchasingNotes } = useStore();
    const [notes, setNotes] = useState(purchasingNotes);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    useEffect(() => {
        setNotes(purchasingNotes);
    }, [purchasingNotes]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updatePurchasingNotes(notes);
            setLastSaved(new Date());
        } catch (error) {
            console.error("Error saving notes:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="glass-card flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-slate-300 font-bold">
                    <StickyNote className="w-5 h-5 text-amber-400" />
                    Bloc de Notas (Compras)
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving || notes === purchasingNotes}
                    className={`p-2 rounded-lg transition-all ${notes === purchasingNotes
                            ? 'text-slate-600'
                            : 'text-amber-400 hover:bg-white/5 active:scale-95'
                        }`}
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                </button>
            </div>

            <div className="flex-1 p-0 relative group">
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Escribe aquí cosas sueltas para comprar o recordatorios..."
                    className="w-full h-full bg-transparent p-4 text-slate-300 text-sm resize-none outline-none placeholder:text-slate-600 custom-scrollbar"
                />
                {lastSaved && notes === purchasingNotes && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] text-slate-500 bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm transition-opacity group-hover:opacity-100 opacity-40">
                        <Check size={10} className="text-emerald-500" />
                        Guardado
                    </div>
                )}
            </div>

            <div className="p-2 bg-amber-500/5 text-[10px] text-slate-500 text-center border-t border-white/5 italic">
                Apunta lo que falta para no olvidarlo.
            </div>
        </div>
    );
};
