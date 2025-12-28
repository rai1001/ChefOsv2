import React from 'react';
import { AIMetricsDashboard } from '@/presentation/components/ai/AIMetricsDashboard';
import { Activity, Shield, Cpu } from 'lucide-react';

export const AITelemetryPage: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary">
            <Activity size={20} />
            <span className="text-sm font-bold uppercase tracking-widest">
              Sistema de Monitoreo
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white">Telemetría de IA</h1>
          <p className="text-slate-400 max-w-2xl">
            Análisis en tiempo real del uso, rendimiento y costes de los modelos de inteligencia
            artificial de CulinaryOS.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-xs text-slate-300">
            <Cpu size={14} className="text-blue-400" />
            <span>Gemini 2.0 Flash</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-xs text-slate-300">
            <Shield size={14} className="text-emerald-400" />
            <span>Presupuesto Activo</span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 pt-10">
        <AIMetricsDashboard />
      </div>

      {/* Additional info footer or help */}
      <div className="mt-12 p-6 bg-primary/5 rounded-2xl border border-primary/10">
        <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
          <Shield size={16} className="text-primary" />
          Sobre el control de costes
        </h4>
        <p className="text-sm text-slate-400 leading-relaxed">
          CulinaryOS utiliza un sistema de cuotas dinámico para cada centro (outlet). Los costes
          mostrados son estimaciones basadas en el consumo de tokens de entrada y salida, ajustados
          por el multiplicador de idioma (Español). Si el presupuesto semanal se agota, el sistema
          activará automáticamente el Circuit Breaker para evitar sobrecostes inesperados.
        </p>
      </div>
    </div>
  );
};
