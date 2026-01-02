import React from 'react';
import { useStore } from '@/presentation/store/useStore';

import { Download, Upload, Database, Sparkles } from 'lucide-react';
import { exportData, importData, getDataSizeEstimate } from '@/utils/backup';
import { useToast } from '@/presentation/components/ui';

// Widgets
import { WeeklyRosterWidget } from '@/presentation/components/dashboard/WeeklyRosterWidget';
import { MonthlyEventsWidget } from '@/presentation/components/dashboard/MonthlyEventsWidget';
import { WeeklyProductionWidget } from '@/presentation/components/dashboard/WeeklyProductionWidget';
import { OrdersWidget } from '@/presentation/components/dashboard/OrdersWidget';
import { AlertsWidget } from '@/presentation/components/dashboard/AlertsWidget';
import { PurchasingNotesWidget } from '@/presentation/components/dashboard/PurchasingNotesWidget';
import { KPIGrid } from '@/presentation/components/dashboard/KPIGrid';
import { ZeroWasteWidget } from '@/presentation/components/dashboard/ZeroWasteWidget';
import { QuickShortcuts } from '@/presentation/components/dashboard/QuickShortcuts';

export const Dashboard: React.FC = () => {
  const { currentUser, settings } = useStore();
  const isHotel = settings.businessType === 'HOTEL';
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
    <div className="p-6 flex flex-col gap-6 bg-surface-dim/30 overflow-auto custom-scrollbar h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 shrink-0 fade-in-up">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/20 rounded-lg text-primary">
              <Sparkles size={16} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80">
              Inteligencia Operativa
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent tracking-tight">
            Dashboard
          </h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            Chef <span className="text-white font-semibold">{currentUser?.name || 'Invitado'}</span>
            , tienes el control hoy.
          </p>
        </div>

        {/* Quick Actions / System Status */}
        <div className="flex gap-4">
          <QuickShortcuts />
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Metrics & Alerts */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          <KPIGrid />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">
                Alertas Críticas
              </h4>
              <AlertsWidget />
              <ZeroWasteWidget />
            </div>

            <div className="flex flex-col gap-6">
              <WeeklyProductionWidget />
            </div>
          </div>

          <div className="flex-1 min-h-[400px]">
            <WeeklyRosterWidget />
          </div>
        </div>

        {/* RIGHT COLUMN: Events & Orders */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="min-h-[450px]">
            <MonthlyEventsWidget title={isHotel ? 'Próximos Eventos' : 'Reservas & Grupos'} />
          </div>

          <div className="min-h-[350px]">
            <OrdersWidget />
          </div>

          <PurchasingNotesWidget />

          {/* Backup & System Info Widget */}
          <div className="premium-glass p-5 space-y-4 shrink-0 transition-transform hover:scale-[1.02]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <Database className="w-5 h-5 text-primary animate-glow" />
                <span className="tracking-wide">SISTEMA</span>
              </div>
              <button
                onClick={handleExport}
                className="p-1.5 hover:bg-white/10 text-slate-500 hover:text-white rounded-lg transition-colors"
                title="Exportar Backup"
              >
                <Download size={16} />
              </button>
            </div>

            <div className="text-xs text-slate-400 space-y-3">
              <div className="flex justify-between items-center">
                <span>Database size:</span>
                <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded">
                  {getDataSizeEstimate()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Versión:</span>
                <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded">
                  2.1.0-RC
                </span>
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={handleImportClick}
                disabled={isImporting}
                className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-primary/20 hover:text-primary border border-white/5 hover:border-primary/30 text-slate-300 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300"
              >
                <Upload className="w-3.5 h-3.5" />
                Restaurar Base de Datos
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
