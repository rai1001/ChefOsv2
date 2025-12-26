import { Calendar, ShoppingCart, Trash2, ShieldCheck, ClipboardList, Factory } from 'lucide-react';

const WidgetPlaceholder = ({ title, icon: Icon, color = 'primary' }: { title: string; icon: any; color?: string }) => (
    <div className="premium-glass p-6 h-full flex flex-col items-center justify-center text-center space-y-4 min-h-[200px] border-dashed border-2 border-white/5 bg-transparent">
        <div className={`p-4 rounded-full bg-${color}/10 text-${color}`}>
            <Icon size={32} />
        </div>
        <div>
            <h3 className="text-lg font-bold text-slate-200">{title}</h3>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Próximamente</p>
        </div>
    </div>
);

export const WeeklyRosterWidget = () => <WidgetPlaceholder title="Planificación Semanal" icon={Calendar} color="blue-500" />;
export const WeeklyProductionWidget = () => <WidgetPlaceholder title="Producción Activa" icon={Factory} color="orange-500" />;
export const MonthlyEventsWidget = () => <WidgetPlaceholder title="Próximos Eventos" icon={Calendar} color="purple-500" />;
export const OrdersWidget = () => <WidgetPlaceholder title="Pedidos & Proveedores" icon={ShoppingCart} color="emerald-500" />;
export const PurchasingNotesWidget = () => <WidgetPlaceholder title="Notas de Compra" icon={ClipboardList} color="yellow-500" />;
export const HACCPWidget = () => (
    <div className="premium-glass p-4 flex items-center justify-between border-l-4 border-emerald-500">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                <ShieldCheck size={24} />
            </div>
            <div>
                <h4 className="font-bold text-white">HACCP: Todo en orden</h4>
                <p className="text-xs text-slate-400">Todos los registros del día completados.</p>
            </div>
        </div>
        <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full font-medium">100%</span>
    </div>
);
export const ZeroWasteWidget = () => (
    <div className="premium-glass p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Trash2 size={64} />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Zero Waste Engine</h3>
        <p className="text-sm text-slate-400 mb-4">IA analizando desperdicios...</p>
        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary h-full w-[0%] animate-[pulse_2s_infinite]" />
        </div>
    </div>
);
