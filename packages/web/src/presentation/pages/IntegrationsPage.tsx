import React from 'react';
import { Mail, Calendar, CheckCircle, XCircle, ExternalLink, Shield, Sparkles, Eye, EyeOff, Save, Key } from 'lucide-react';
import { useStore } from '@/presentation/store/useStore';
import { firestoreService } from '@/services/firestoreService';
const { update: updateDocument } = firestoreService;
import { COLLECTION_NAMES } from '@/config/collections';

export const IntegrationsPage = () => {
    const {
        integrations, connectIntegration, disconnectIntegration,
        activeOutletId, outlets
    } = useStore();

    const activeOutlet = outlets.find(o => o.id === activeOutletId);

    const providerIcons = {
        google: Mail,
        microsoft: Calendar,
        gemini: Sparkles
    };

    const [apiKey, setApiKey] = React.useState('');
    const [workspaceEmail, setWorkspaceEmail] = React.useState('');
    const [outlookEmail, setOutlookEmail] = React.useState('');
    const [showKey, setShowKey] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        if (activeOutlet) {
            setApiKey(activeOutlet.geminiApiKey || '');
            setWorkspaceEmail(activeOutlet.workspaceAccount || '');
            setOutlookEmail(activeOutlet.outlookAccount || '');
        }
    }, [activeOutlet]);

    const handleConnect = async (id: string, token?: string) => {
        await connectIntegration(id);

        if (!activeOutletId) {
            console.error("No active outlet selected");
            return;
        }

        try {
            setIsSaving(true);
            const updates: any = {};
            if (id === 'google-gemini' && token) updates.geminiApiKey = token;
            if (id === 'google-workspace' && token) updates.workspaceAccount = token;
            if (id === 'outlook-365' && token) updates.outlookAccount = token;

            if (Object.keys(updates).length > 0) {
                await updateDocument(COLLECTION_NAMES.OUTLETS, activeOutletId, updates);
            }
        } catch (error) {
            console.error("Error saving Integration account:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDisconnect = async (id: string) => {
        await disconnectIntegration(id);

        if (!activeOutletId) return;

        try {
            const updates: any = {};
            if (id === 'google-gemini') {
                setApiKey('');
                updates.geminiApiKey = '';
            }
            if (id === 'google-workspace') {
                setWorkspaceEmail('');
                updates.workspaceAccount = '';
            }
            if (id === 'outlook-365') {
                setOutlookEmail('');
                updates.outlookAccount = '';
            }

            if (Object.keys(updates).length > 0) {
                await updateDocument(COLLECTION_NAMES.OUTLETS, activeOutletId, updates);
            }
        } catch (error) {
            console.error("Error clearing integration account:", error);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Integraciones</h1>
                    <p className="text-slate-400">
                        Conecta tus herramientas externas para potenciar la automatización de ChefOS.
                    </p>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {integrations.map((integration) => (
                    <div
                        key={integration.id}
                        className={`
              relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300
              ${integration.status === 'connected'
                                ? 'bg-surface border-green-500/30 shadow-lg shadow-green-500/10'
                                : 'bg-surface border-white/5 hover:border-white/10'
                            }
            `}
                    >
                        {/* Status Badge */}
                        <div className="absolute top-4 right-4">
                            {integration.status === 'connected' && (
                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-semibold border border-green-500/20">
                                    <CheckCircle size={12} />
                                    Conectado
                                </span>
                            )}
                            {integration.status === 'disconnected' && (
                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/10 text-slate-400 text-xs font-semibold border border-white/5">
                                    <XCircle size={12} />
                                    Desconectado
                                </span>
                            )}
                        </div>

                        <div className="p-6 flex flex-col h-full">
                            {/* Icon & Title */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`p-3 rounded-xl ${integration.id === 'google-gemini' ? 'bg-indigo-500/10 text-indigo-400' : integration.provider === 'google' ? 'bg-blue-500/10 text-blue-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                    {React.createElement(providerIcons[integration.id === 'google-gemini' ? 'gemini' : integration.provider] || Mail, { size: 28 })}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{integration.name}</h3>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{integration.provider}</p>
                                </div>
                            </div>

                            <p className="text-slate-400 text-sm mb-6">
                                {integration.description}
                            </p>

                            {/* Features List */}
                            <div className="space-y-2 mb-8">
                                {integration.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                                        {feature}
                                    </div>
                                ))}
                            </div>

                            {/* Gemini Specific UI */}
                            {integration.id === 'google-gemini' && (
                                <div className="mt-auto mb-6 p-4 bg-black/20 rounded-xl border border-white/5 space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <Key size={14} />
                                        Configuración de API
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showKey ? "text" : "password"}
                                            placeholder="Introduce tu Gemini API Key..."
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            disabled={integration.status === 'connected'}
                                            className="w-full bg-background border border-white/10 rounded-lg pl-4 pr-10 py-2.5 text-sm text-white focus:border-primary outline-none transition-all disabled:opacity-50"
                                        />
                                        <button
                                            onClick={() => setShowKey(!showKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                        >
                                            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 italic">
                                        Consigue tu clave en <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>.
                                    </p>
                                </div>
                            )}

                            {/* Google Workspace & Outlook Account UI */}
                            {(integration.id === 'google-workspace' || integration.id === 'outlook-365') && (
                                <div className="mt-auto mb-6 p-4 bg-black/20 rounded-xl border border-white/5 space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <Mail size={14} />
                                        Cuenta de Correo
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            placeholder="ejemplo@empresa.com"
                                            value={integration.id === 'google-workspace' ? workspaceEmail : outlookEmail}
                                            onChange={(e) => {
                                                if (integration.id === 'google-workspace') setWorkspaceEmail(e.target.value);
                                                else setOutlookEmail(e.target.value);
                                            }}
                                            disabled={integration.status === 'connected'}
                                            className="w-full bg-background border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary outline-none transition-all disabled:opacity-50"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 italic">
                                        Esta cuenta se usará para escanear eventos automáticamente.
                                    </p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className={`flex items-center justify-between pt-6 border-t border-white/5 ${(!['google-gemini', 'google-workspace', 'outlook-365'].includes(integration.id)) ? 'mt-auto' : ''}`}>
                                {integration.status === 'connected' ? (
                                    <button
                                        onClick={() => handleDisconnect(integration.id)}
                                        className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                                    >
                                        {integration.id === 'google-gemini' ? 'Eliminar Clave' : 'Eliminar Cuenta'}
                                    </button>
                                ) : (
                                    <div className="text-xs text-slate-500">
                                        {integration.id === 'google-gemini' ? 'Clave requerida' : 'Cuenta requerida'}
                                    </div>
                                )}

                                <button
                                    onClick={() => {
                                        if (integration.status === 'connected') return;
                                        if (integration.id === 'google-gemini') {
                                            if (apiKey.trim()) handleConnect(integration.id, apiKey);
                                        } else if (integration.id === 'google-workspace') {
                                            if (workspaceEmail.trim()) handleConnect(integration.id, workspaceEmail);
                                        } else if (integration.id === 'outlook-365') {
                                            if (outlookEmail.trim()) handleConnect(integration.id, outlookEmail);
                                        } else {
                                            handleConnect(integration.id);
                                        }
                                    }}
                                    disabled={
                                        (integration.id === 'google-gemini' && !apiKey.trim() && integration.status !== 'connected') ||
                                        (integration.id === 'google-workspace' && !workspaceEmail.trim() && integration.status !== 'connected') ||
                                        (integration.id === 'outlook-365' && !outlookEmail.trim() && integration.status !== 'connected') ||
                                        isSaving
                                    }
                                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                      ${integration.status === 'connected'
                                            ? 'bg-white/5 text-slate-400 cursor-default'
                                            : 'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/25 active:scale-95 disabled:opacity-50'
                                        }
                    `}
                                >
                                    {integration.status === 'connected' ? (
                                        <>
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            {integration.id === 'google-gemini' ? 'Activo' : 'Sincronizando'}
                                        </>
                                    ) : (
                                        <>
                                            {integration.id === 'google-gemini' ? (
                                                <>
                                                    <Save size={16} />
                                                    {isSaving ? 'Guardando...' : 'Guardar Clave'}
                                                </>
                                            ) : (
                                                <>
                                                    Conectar
                                                    <ExternalLink size={16} />
                                                </>
                                            )}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Info Section */}
            <div className="bg-blue-500/5 rounded-2xl p-6 border border-blue-500/10 flex gap-4">
                <div className="text-blue-400 shrink-0">
                    <Shield size={24} />
                </div>
                <div>
                    <h4 className="text-lg font-semibold text-blue-100 mb-1">Privacidad y Seguridad</h4>
                    <p className="text-sm text-blue-200/70">
                        ChefOS solo accede a los datos necesarios para la gestión de eventos.
                        Tus correos son procesados por la IA en tiempo real y no se almacenan permanentemente,
                        salvo aquellos convertidos en eventos confirmados.
                    </p>
                </div>
            </div>
        </div>
    );
};

