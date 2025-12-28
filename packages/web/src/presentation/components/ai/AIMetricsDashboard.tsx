import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Activity,
  DollarSign,
  Zap,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
} from 'lucide-react';
import { useAIMetrics } from '@/presentation/hooks/ai/useAIMetrics';
import { useStore } from '@/presentation/store/useStore';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export const AIMetricsDashboard: React.FC = () => {
  const { activeOutletId } = useStore();
  const { aggregatedData, loading, error } = useAIMetrics(activeOutletId || '');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center text-red-500 bg-red-500/10 rounded-xl border border-red-500/20">
        <AlertTriangle className="mx-auto mb-4" size={48} />
        <p className="text-xl font-bold">Error al cargar métricas</p>
        <p className="text-sm opacity-70">{error}</p>
      </div>
    );
  }

  const { stats, dailyUsage, featureUsage } = aggregatedData;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Coste Total (Mensual)"
          value={`$${stats.totalCost.toFixed(4)}`}
          icon={<DollarSign className="text-emerald-400" />}
          trend="+12% vs mes anterior"
        />
        <StatCard
          label="Llamadas IA"
          value={stats.totalCalls}
          icon={<Activity className="text-blue-400" />}
          trend={`${dailyUsage.length} días activos`}
        />
        <StatCard
          label="Tasa de Éxito"
          value={`${stats.successRate.toFixed(1)}%`}
          icon={<Zap className="text-amber-400" />}
          trend={stats.successRate > 99 ? 'Excelente' : 'Requiere Revisión'}
        />
        <StatCard
          label="Latencia Media"
          value={`${(stats.avgLatency / 1000).toFixed(2)}s`}
          icon={<TrendingUp className="text-purple-400" />}
          trend="Optimizado"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Usage Over Time */}
        <div className="lg:col-span-2 bg-surface/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-primary" />
              <h3 className="text-xl font-bold text-white">Uso de IA por Día</h3>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyUsage}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={12}
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution by Feature */}
        <div className="bg-surface/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <PieChartIcon className="text-primary" />
            <h3 className="text-xl font-bold text-white">Distribución por Función</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={featureUsage}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {featureUsage.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {featureUsage.slice(0, 4).map((f, i) => (
              <div key={f.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  ></div>
                  <span className="text-slate-400 capitalize">
                    {f.name.replace(/([A-Z])/g, ' $1')}
                  </span>
                </div>
                <span className="text-white font-medium">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, trend }) => (
  <div className="bg-surface/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-lg hover:border-white/10 transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-white/5 rounded-xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
    </div>
    <div>
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <h4 className="text-3xl font-bold text-white tracking-tight">{value}</h4>
      {trend && <p className="text-xs text-slate-500 mt-2">{trend}</p>}
    </div>
  </div>
);
