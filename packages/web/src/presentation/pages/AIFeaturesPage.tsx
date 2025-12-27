import { useState } from 'react';
import { generateContent, generateMenuFromCriteria } from '@/services/geminiService';
import { InvoiceUploader } from '@/presentation/components/ai/InvoiceUploader';
import { Sparkles, Loader2, ChefHat, MessageSquare, Send } from 'lucide-react';
import type { GeneratedMenu } from '@/types';

// Wrapper for Invoice Scanner
export const AIInvoiceScanner = () => (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Escáner Inteligente</h1>
            <p className="text-slate-400">Digitaliza tus facturas y albaranes automáticamente</p>
        </div>
        <InvoiceUploader />
    </div>
);

// Full Page Menu Generator
export const AIMenuGenerator = () => {
    const [eventType, setEventType] = useState('Boda');
    const [pax, setPax] = useState(100);
    const [season] = useState('Temporada Actual');
    const [restrictions, setRestrictions] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<GeneratedMenu | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const response = await generateMenuFromCriteria({
                eventType,
                pax,
                season,
                restrictions: restrictions.split(',').map(s => s.trim()).filter(Boolean)
            });
            if (response.success && response.data) {
                setResult(response.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-white mb-2 flex justify-center items-center gap-3">
                    <Sparkles className="text-purple-400" />
                    Generador de Menús IA
                </h1>
                <p className="text-slate-400">Crea propuestas gastronómicas únicas en segundos</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Controls */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-surface border border-white/10 rounded-xl p-6 space-y-4">
                        <h3 className="font-semibold text-white">Configuración del Evento</h3>

                        <div>
                            <label className="text-sm text-slate-400 block mb-1">Tipo de Evento</label>
                            <select
                                value={eventType} onChange={e => setEventType(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-purple-500"
                            >
                                <option>Boda</option>
                                <option>Empresa</option>
                                <option>Gala</option>
                                <option>Comida Informal</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 block mb-1">Comensales</label>
                            <input
                                type="number"
                                value={pax} onChange={e => setPax(Number(e.target.value))}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-purple-500"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 block mb-1">Restricciones / Notas</label>
                            <textarea
                                value={restrictions} onChange={e => setRestrictions(e.target.value)}
                                placeholder="Ej. Sin gluten, vegano..."
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-purple-500 h-24"
                            />
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-3 font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                            {loading ? 'Diseñando...' : 'Generar Menú'}
                        </button>
                    </div>
                </div>

                {/* Preview */}
                <div className="lg:col-span-2">
                    {result ? (
                        <div className="bg-white text-gray-900 rounded-xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="text-center border-b border-gray-100 pb-6 mb-6">
                                <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">{result.name}</h2>
                                <p className="text-gray-500 italic">{result.description}</p>
                            </div>

                            <div className="space-y-8">
                                {result.dishes.map((dish, idx) => (
                                    <div key={idx} className="relative pl-6 border-l-2 border-purple-200">
                                        <span className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1 block">
                                            {dish.category}
                                        </span>
                                        <h3 className="text-xl font-medium text-gray-900 mb-2">{dish.name}</h3>
                                        <p className="text-gray-600 leading-relaxed">{dish.description}</p>
                                        {dish.allergens.length > 0 && (
                                            <div className="mt-2 flex gap-2">
                                                {dish.allergens.map(a => (
                                                    <span key={a} className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-full uppercase tracking-wider">
                                                        {a}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
                                <span>Coste Est.: {result.estimatedCost}€</span>
                                <span>PVP Rec.: {result.sellPrice}€</span>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-surface border border-white/5 rounded-xl border-dashed">
                            <Sparkles className="w-16 h-16 text-slate-700 mb-4" />
                            <p className="text-slate-500 text-lg">Configura los parámetros y genera una propuesta</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Chef Assistant (Chat)
export const AIChefAssistant = () => {
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        try {
            const res = await generateContent(`Act as a Michelin Star Chef assistant. Answer concisely and professionally. Query: ${prompt}`);
            setResponse(res);
        } catch (error) {
            console.error(error);
            setResponse('Lo siento, hubo un error al procesar tu consulta.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-3xl mx-auto h-[calc(100vh-100px)] flex flex-col">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2 flex justify-center items-center gap-3">
                    <ChefHat className="text-primary" />
                    Asistente Chef
                </h1>
                <p className="text-slate-400">Consulta recetas, técnicas y dudas culinarias</p>
            </div>

            <div className="flex-1 bg-surface border border-white/10 rounded-xl p-6 mb-4 overflow-y-auto custom-scrollbar">
                {!response && !loading && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                        <MessageSquare className="w-12 h-12 mb-2" />
                        <p>¿En qué puedo ayudarte hoy, Chef?</p>
                    </div>
                )}
                {loading && (
                    <div className="flex items-start gap-4 animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <ChefHat size={16} className="text-primary" />
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 w-3/4 h-24"></div>
                    </div>
                )}
                {response && (
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <ChefHat size={16} className="text-primary" />
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {response}
                        </div>
                    </div>
                )}
            </div>

            <div className="relative">
                <input
                    type="text"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Pregunta sobre recetas, maridajes o técnicas..."
                    className="w-full bg-surface border border-white/10 rounded-xl pl-4 pr-12 py-4 text-white focus:border-primary outline-none shadow-xl"
                />
                <button
                    onClick={handleSend}
                    disabled={loading || !prompt.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
};


export const AIFeaturesPage = () => {
    return (
        <div className="space-y-12 pb-20">
            <AIMenuGenerator />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto px-6">
                <div className="bg-surface/30 rounded-2xl border border-white/5 overflow-hidden">
                    <AIInvoiceScanner />
                </div>
                <div className="bg-surface/30 rounded-2xl border border-white/5 overflow-hidden min-h-[600px]">
                    <AIChefAssistant />
                </div>
            </div>
        </div>
    );
};

