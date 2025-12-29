import React, { useState } from 'react';
import { ClipboardList, Settings, Thermometer, ListChecks, History, Bell } from 'lucide-react';
import { UniversalImporter } from '@/presentation/components/common/UniversalImporter';
import { useStore } from '@/presentation/store/useStore';
import { useToast } from '@/presentation/components/ui';
import type { HACCPLog } from '@/types';
import { PCCConfiguration } from '@/presentation/components/haccp/PCCConfiguration';
import { DailyRegisters } from '@/presentation/components/haccp/DailyRegisters';
import { TaskManager } from '@/presentation/components/haccp/TaskManager';
import { HACCPHistory } from '@/presentation/components/haccp/HACCPHistory';
import { HACCPAlerts } from '@/presentation/components/haccp/HACCPAlerts';
import { ChecklistView } from '@/presentation/components/haccp/ChecklistView';

type TabId = 'alerts' | 'checklist' | 'daily' | 'tasks' | 'history' | 'config';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabConfig[] = [
  { id: 'alerts', label: 'Alertas', icon: <Bell className="w-4 h-4" /> },
  { id: 'checklist', label: 'Checklist', icon: <ListChecks className="w-4 h-4" /> },
  { id: 'daily', label: 'Registros', icon: <Thermometer className="w-4 h-4" /> },
  { id: 'tasks', label: 'Gestión Tareas', icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'history', label: 'Histórico', icon: <History className="w-4 h-4" /> },
  { id: 'config', label: 'Puntos Críticos', icon: <Settings className="w-4 h-4" /> },
];

export const HACCPPage: React.FC = () => {
  const { pccs, addHACCPLog } = useStore();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('alerts');

  const handleImportComplete = (data: any) => {
    const entries = data.entries || [];
    const activePCCs = pccs.filter((p) => p.isActive);
    let matchedCount = 0;

    entries.forEach((entry: any) => {
      const scannedName = (entry.pccName || '').toLowerCase();
      const match = activePCCs.find((p) => {
        const pName = p.name.toLowerCase();
        return pName.includes(scannedName) || scannedName.includes(pName);
      });

      if (match && entry.value) {
        const value = parseFloat(entry.value);

        let status: 'CORRECT' | 'WARNING' | 'CRITICAL' = 'CORRECT';
        if (match.minTemp !== undefined && match.maxTemp !== undefined) {
          if (value < match.minTemp || value > match.maxTemp) {
            status = 'CRITICAL';
          } else if (value === match.minTemp || value === match.maxTemp) {
            status = 'WARNING';
          }
        }

        const newLog: HACCPLog = {
          id: crypto.randomUUID(),
          pccId: match.id,
          value,
          timestamp:
            entry.date && entry.time ? `${entry.date}T${entry.time}` : new Date().toISOString(),
          userId: 'current-user',
          status,
          notes: entry.status !== 'CORRECT' ? `Scanned: ${entry.status}` : undefined,
        };

        addHACCPLog(newLog);
        matchedCount++;
      }
    });

    if (matchedCount > 0) {
      addToast(`Se han importado ${matchedCount} registros correctamente`, 'success');
    } else {
      addToast('No se encontraron coincidencias en los puntos críticos', 'warning');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'alerts':
        return <HACCPAlerts />;
      case 'checklist':
        return <ChecklistView />;
      case 'daily':
        return <DailyRegisters />;
      case 'tasks':
        return <TaskManager />;
      case 'history':
        return <HACCPHistory />;
      case 'config':
        return <PCCConfiguration />;
      default:
        return <HACCPAlerts />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-700">
      {/* Header Area */}
      <div className="flex-none p-10 pb-0">
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 pb-10 border-b border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[100px] -mr-48 -mt-48 pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-500/10 rounded-[1.5rem] border border-emerald-500/20 shadow-lg shadow-emerald-500/10 scale-110">
                <ClipboardList className="w-8 h-8 text-emerald-400 animate-glow" />
              </div>
              <div>
                <h1 className="text-5xl font-black text-white uppercase tracking-tighter leading-none mb-1">
                  HACCP <span className="text-emerald-400">Digital</span>
                </h1>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] ml-1">
                  Protocolos de Seguridad Alimentaria
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 relative z-10">
            <UniversalImporter
              buttonLabel="Importar HACCP"
              defaultType="haccp"
              onCompleted={handleImportComplete}
            />
          </div>
        </header>
      </div>

      {/* DataImportModal removed - replaced by inline UniversalImporter above */}

      {/* Main Navigation & Content */}
      <div className="flex-1 flex flex-col p-10 pt-8 gap-10 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex gap-4 p-1 premium-glass border border-white/5 rounded-2xl w-fit overflow-x-auto print:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300
                                ${
                                  activeTab === tab.id
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-[1.05]'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                }`}
            >
              <span className={activeTab === tab.id ? 'animate-glow' : ''}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="max-w-[1600px] mx-auto pb-20">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
};
