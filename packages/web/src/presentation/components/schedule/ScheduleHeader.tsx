import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Play, RefreshCw, Printer, Download } from 'lucide-react';

interface ScheduleHeaderProps {
    currentDate: Date;
    viewMode: 'month' | 'week';
    generating: boolean;
    onPrevious: () => void;
    onNext: () => void;
    onViewModeChange: (mode: 'month' | 'week') => void;
    onGenerate: () => void;
    onExport: () => void;
    onPrint: () => void;
}

export const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
    currentDate,
    viewMode,
    generating,
    onPrevious,
    onNext,
    onViewModeChange,
    onGenerate,
    onExport,
    onPrint
}) => {
    return (
        <div className="flex flex-wrap justify-between items-center gap-4 pb-6 border-b border-white/10">
            <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                    Horarios
                </h2>

                {/* Month/Week Navigation */}
                <div className="flex items-center gap-2 bg-surface rounded-lg p-1">
                    <button
                        onClick={onPrevious}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="px-3 font-medium min-w-[140px] text-center capitalize">
                        {viewMode === 'month'
                            ? format(currentDate, 'MMMM yyyy', { locale: es })
                            : `Semana del ${format(currentDate, 'd MMM', { locale: es })}`
                        }
                    </span>
                    <button
                        onClick={onNext}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* View Mode Toggle */}
                <div className="flex bg-surface rounded-lg p-1">
                    <button
                        onClick={() => onViewModeChange('month')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'month' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Mes
                    </button>
                    <button
                        onClick={() => onViewModeChange('week')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'week' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Semana
                    </button>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onGenerate}
                    disabled={generating}
                    className="flex items-center gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-lg shadow-primary/25 disabled:opacity-50 transition-all"
                >
                    {generating ? (
                        <RefreshCw size={16} className="animate-spin" />
                    ) : (
                        <Play size={16} />
                    )}
                    {generating ? 'Generando...' : 'Generar Horario'}
                </button>
                <button
                    onClick={onExport}
                    className="p-2 bg-surface hover:bg-white/10 rounded-lg transition-colors"
                    title="Exportar a Excel"
                >
                    <Download size={18} />
                </button>
                <button
                    onClick={onPrint}
                    className="p-2 bg-surface hover:bg-white/10 rounded-lg transition-colors"
                    title="Imprimir"
                >
                    <Printer size={18} />
                </button>
            </div>
        </div>
    );
};
