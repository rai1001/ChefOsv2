import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Minimize2, Loader2, Sparkles } from 'lucide-react';
import { chatWithCopilot } from '@/services/ai/functions';

interface Message {
    role: 'user' | 'model';
    content: string;
}

export const KitchenCopilot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', content: 'Hola chef, soy tu Copiloto de Cocina. ¿En qué te puedo ayudar hoy? (Recetas, inventario, seguridad...)' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        try {
            // Pass history excluding the last user message we just added locally for optimistic UI
            // But API expects history to include previous turns. 
            // Our backend expects { message, history }. History should be previous messages.
            const history = messages.map(m => ({ role: m.role, content: m.content }));

            const result = await chatWithCopilot({ message: userMessage, history });
            const data = result.data as { response: string };

            if (data.response) {
                setMessages(prev => [...prev, { role: 'model', content: data.response }]);
            }
        } catch (error) {
            console.error("Chat failed", error);
            setMessages(prev => [...prev, { role: 'model', content: "Lo siento, tuve un problema conectando con el servidor. Inténtalo de nuevo." }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all z-50 group"
                title="Abrir Copiloto"
            >
                <Sparkles className="w-6 h-6 text-white animate-pulse" />
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Asistente IA
                </span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-200">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-2 text-white font-semibold">
                    <Bot className="w-5 h-5 text-purple-400" />
                    <h3>Kitchen Copilot</h3>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                    aria-label="Minimizar chat"
                >
                    <Minimize2 className="w-4 h-4" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950/50">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-700' : 'bg-purple-900/50'
                            }`}>
                            {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                        </div>
                        <div className={`p-3 rounded-2xl text-sm max-w-[80%] ${msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-tr-sm'
                            : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-white/5'
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center shrink-0">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-800 text-slate-400 rounded-tl-sm border border-white/5 text-xs flex items-center">
                            Pensando...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-900 border-t border-white/10">
                <div className="relative">
                    <input
                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                        placeholder="Pregunta sobre recetas, stock..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        disabled={loading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="absolute right-2 top-2 p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:bg-transparent"
                        aria-label="Enviar mensaje"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
