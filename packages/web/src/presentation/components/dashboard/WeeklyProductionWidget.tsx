import React, { useMemo } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChefHat, Clock, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const WeeklyProductionWidget: React.FC = () => {
  const { productionTasks, events } = useStore();
  const navigate = useNavigate();
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const { tasks, chartData, todayStats } = useMemo(() => {
    const weekEventsFiltered = events.filter((e) => {
      const d = parseISO(e.date);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    });

    const aggregatedEventsMap = new Map<string, any>();
    weekEventsFiltered.forEach((event) => {
      const key = `${event.date}_${event.name.trim().toLowerCase()}`;
      if (aggregatedEventsMap.has(key)) {
        aggregatedEventsMap.get(key).pax += event.pax;
        aggregatedEventsMap.get(key).ids.push(event.id);
      } else {
        aggregatedEventsMap.set(key, { ...event, ids: [event.id] });
      }
    });

    const allTasks: any[] = [];
    const dailyCounts: Record<string, number> = {};

    aggregatedEventsMap.forEach((aggEvent) => {
      const consolidatedTasksMap = new Map<string, any>();

      aggEvent.ids.forEach((eventId: string) => {
        const eventTasks = productionTasks[eventId] || [];
        eventTasks.forEach((task) => {
          if (task.status !== 'done') {
            const taskKey = `${task.recipeId || task.title}_${task.station}`;
            if (consolidatedTasksMap.has(taskKey)) {
              consolidatedTasksMap.get(taskKey).quantity += task.quantity;
            } else {
              consolidatedTasksMap.set(taskKey, {
                ...task,
                eventName: aggEvent.name,
                eventDate: aggEvent.date,
              });
            }

            // For chart
            const d = task.assignedDate || aggEvent.date;
            dailyCounts[d] = (dailyCounts[d] || 0) + 1;
          }
        });
      });

      allTasks.push(...Array.from(consolidatedTasksMap.values()));
    });

    const sortedTasks = allTasks.sort((a, b) => {
      const dateA = a.assignedDate || a.eventDate;
      const dateB = b.assignedDate || b.eventDate;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    // Today Stats
    const todayTasks = sortedTasks.filter((t) =>
      isSameDay(parseISO(t.assignedDate || t.eventDate), today)
    );

    // Chart Data
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const data = days.map((day, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateStr = format(date, 'yyyy-MM-dd');
      return {
        day,
        count: dailyCounts[dateStr] || 0,
        isToday: dateStr === format(today, 'yyyy-MM-dd'),
      };
    });

    return { tasks: sortedTasks, chartData: data, todayStats: { count: todayTasks.length } };
  }, [productionTasks, events, weekStart, weekEnd, today]);

  return (
    <div className="premium-glass p-0 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
        <h3 className="font-bold flex items-center gap-2 text-slate-100 uppercase tracking-tighter text-sm">
          <BarChart3 className="w-5 h-5 text-primary" />
          Producción & Carga
        </h3>
        <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-1 rounded-md border border-primary/20">
          SEMANA {format(today, 'w')}
        </span>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-4 space-y-6">
        {/* Today Summary Card */}
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">
              Hoy en Cocina
            </div>
            <div className="text-2xl font-bold text-white">
              {todayStats.count}{' '}
              <span className="text-slate-400 text-sm font-normal">tareas activas</span>
            </div>
          </div>
          <div className="p-3 bg-primary/20 rounded-xl text-primary">
            <ChefHat size={24} />
          </div>
        </div>

        {/* Production Chart */}
        <div className="h-32 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                dy={10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                }}
                itemStyle={{ color: '#fff', fontSize: '10px' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isToday ? '#3b82f6' : 'rgba(59, 130, 246, 0.3)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming Tasks List */}
        <div className="space-y-3 pt-2">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
            Próximas Tareas
          </div>
          {tasks.slice(0, 5).map((task) => (
            <div
              key={task.id}
              className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/30 transition-all group"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-200 group-hover:text-primary transition-colors">
                  {task.title}
                </span>
                <span className="text-[9px] font-bold text-slate-500">
                  {task.quantity} {task.unit}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 opacity-60">
                <Clock size={10} />
                <span className="text-[10px] font-medium text-slate-400">
                  {format(parseISO(task.assignedDate || task.eventDate), 'EEE d MMM', {
                    locale: es,
                  })}
                </span>
              </div>
            </div>
          ))}
          {tasks.length > 5 && (
            <button
              onClick={() => navigate('/production')}
              className="w-full py-2 text-[10px] font-bold text-slate-500 hover:text-white transition-colors"
            >
              Y {tasks.length - 5} TAREAS MÁS →
            </button>
          )}
        </div>
      </div>

      <div className="p-3 bg-white/[0.02] border-t border-white/5 text-center">
        <button
          onClick={() => navigate('/production')}
          className="text-[10px] font-black text-slate-500 hover:text-primary uppercase tracking-[0.2em] transition-all"
        >
          Ver Plan de Producción
        </button>
      </div>
    </div>
  );
};
