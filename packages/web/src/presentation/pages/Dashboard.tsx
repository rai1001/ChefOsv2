import React from 'react';
import { useStore } from '@/presentation/store/useStore';


import { Download, Upload, Database } from 'lucide-react';
import { exportData, importData, getDataSizeEstimate } from '@/utils/backup';
import { useToast } from '@/presentation/components/ui';

// Widgets
import { WeeklyRosterWidget } from '@/presentation/components/dashboard/WeeklyRosterWidget';
import { MonthlyEventsWidget } from '@/presentation/components/dashboard/MonthlyEventsWidget';
import { WeeklyProductionWidget } from '@/presentation/components/dashboard/WeeklyProductionWidget';
import { OrdersWidget } from '@/presentation/components/dashboard/OrdersWidget';
import { HACCPWidget } from '@/presentation/components/dashboard/HACCPWidget';
import { PurchasingNotesWidget } from '@/presentation/components/dashboard/PurchasingNotesWidget';
import { KPIGrid } from '@/presentation/components/dashboard/KPIGrid';
import { ZeroWasteWidget } from '@/presentation/components/dashboard/ZeroWasteWidget';


export const Dashboard: React.FC = () => {
    const { currentUser } = useStore();
    const { addToast } = useToast();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = React.useState(false);

    const handleExport = () => {
        try {
            exportData();
            addToast('Backup exportado correctamente', 'success');
        } catch (error) {
            addToast('Error al exportar backup', 'error');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const result = await importData(file, 'replace');
        setIsImporting(false);

        if (result.success) {
            addToast(result.message, 'success');
        } else {
            addToast(result.message, 'error');
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="p-6 flex flex-col gap-6 bg-surface-dim/30">
            <header className="flex justify-between items-end shrink-0 fade-in-up">
                <div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent tracking-tight">
                        Centro de Mando
                    </h1>
                    <p className="text-slate-400 mt-1 flex items-center gap-2">
                        Hola, <span className="text-white font-semibold">{currentUser?.name || 'Chef'}</span>.
                        <span className="w-1.25 h-1.25 rounded-full bg-emerald-500 animate-pulse" />
                        Sistema operativo.
                    </p>
                </div>

                {/* Quick Actions / System Status */}
                <div className="flex gap-3">
                    <button
                        onClick={handleExport}
                        className="premium-glass hover:bg-white/10 text-slate-400 hover:text-white p-3 rounded-xl border border-white/5 transition-all duration-300"
                        title="Exportar Backup"
                    >
                        <Download className="w-5 h-5 transition-transform group-hover:-translate-y-1" />
                    </button>
                </div>
            </header>

            {/* High Level Metrics */}
            <KPIGrid />

            {/* HACCP Alert Row */}
            <div className="fade-in-up" style={{ animationDelay: '400ms' }}>
                <HACCPWidget />
            </div>

            {/* AI Zero Waste Engine Row */}
            <div className="fade-in-up" style={{ animationDelay: '500ms' }}>
                <div className="max-w-md">
                    <ZeroWasteWidget />
                </div>
            </div>


            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">

                {/* Column 1: Roster & Production (Wide) */}
                <div className="lg:col-span-2 xl:col-span-2 flex flex-col gap-6 h-full">
                    <div className="flex-[2] min-h-[400px]">
                        <WeeklyRosterWidget />
                    </div>
                    <div className="flex-1 min-h-[300px]">
                        <WeeklyProductionWidget />
                    </div>
                </div>

                {/* Column 2: Events */}
                <div className="flex flex-col gap-6 h-[400px] lg:h-full lg:col-span-1">
                    <div className="flex-1 min-h-[300px]">
                        <MonthlyEventsWidget />
                    </div>
                </div>

                {/* Column 3: Orders & Backup/Tools */}
                <div className="flex flex-col gap-6 h-[800px] lg:h-full lg:col-span-1">
                    <div className="flex-1 min-h-[400px]">
                        <OrdersWidget />
                    </div>
                    <div className="flex-1 min-h-[300px]">
                        <PurchasingNotesWidget />
                    </div>

                    {/* Backup & System Info Widget */}
                    <div className="premium-glass p-5 space-y-4 shrink-0 transition-transform hover:scale-[1.02]">
                        <div className="flex items-center gap-2 text-slate-300 font-bold border-b border-white/10 pb-3">
                            <Database className="w-5 h-5 text-primary animate-glow" />
                            <span className="tracking-wide">ESTADO DE SISTEMA</span>
                        </div>
                        <div className="text-xs text-slate-400 space-y-3">
                            <div className="flex justify-between items-center">
                                <span>Backup Size:</span>
                                <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded">{getDataSizeEstimate()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Versión:</span>
                                <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded">2.0.1 PRO</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={handleImportClick}
                                disabled={isImporting}
                                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-primary/20 hover:text-primary border border-white/5 hover:border-primary/30 text-slate-300 py-2.5 rounded-lg text-xs font-semibold transition-all duration-300"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                Importar
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
