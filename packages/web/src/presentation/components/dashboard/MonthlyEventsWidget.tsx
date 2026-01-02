import React, { useMemo } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { format, isSameMonth, parseISO, isAfter, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MonthlyEventsWidgetProps {
  title?: string;
}

const PAXBadge = ({ count }: { count: number }) => {
  const colorClass =
    count > 100
      ? 'bg-rose-500/20 text-rose-400 border-rose-500/20'
      : count > 50
        ? 'bg-amber-500/20 text-amber-400 border-amber-500/20'
        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${colorClass}`}>
      {count} PAX
    </span>
  );
};

export const MonthlyEventsWidget: React.FC<MonthlyEventsWidgetProps> = ({ title }) => {
  const { events } = useStore();
  const navigate = useNavigate();
  const today = startOfDay(new Date());

  const monthlyEvents = useMemo(() => {
    const filtered = events.filter((e) => isSameMonth(parseISO(e.date), today));

    // Group by Date + Name
    const groupedMap = new Map<string, any>();

    filtered.forEach((event) => {
      const key = `${event.date}_${event.name.trim().toLowerCase()}`;
      if (groupedMap.has(key)) {
        const existing = groupedMap.get(key);
        existing.pax += event.pax;
      } else {
        groupedMap.set(key, { ...event });
      }
    });

    return Array.from(groupedMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [events, today]);

  return (
    <div className="premium-glass p-0 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
        <h3 className="font-bold flex items-center gap-2 text-slate-100 uppercase tracking-tighter text-sm">
          <Calendar className="w-5 h-5 text-purple-400" />
          {title || `Eventos: ${format(today, 'MMMM', { locale: es })}`}
        </h3>
        <button
          onClick={() => navigate('/events')}
          className="text-[10px] font-black text-primary hover:text-primary/80 uppercase tracking-widest"
        >
          Ver Calendario
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-3">
        {monthlyEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
            <Calendar className="w-8 h-8 opacity-20" />
            <p className="text-sm">Sin eventos este mes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {monthlyEvents.map((event) => {
              const eventDate = parseISO(event.date);
              const isPast = isAfter(today, eventDate);
              const isToday = format(today, 'yyyy-MM-dd') === event.date;

              return (
                <div
                  key={event.id}
                  onClick={() => navigate('/events')}
                  className={`p-4 rounded-xl border flex items-center gap-4 transition-all cursor-pointer group
                                        ${
                                          isToday
                                            ? 'bg-primary/10 border-primary/30 shadow-lg shadow-primary/5'
                                            : isPast
                                              ? 'bg-white/[0.02] border-white/5 opacity-50'
                                              : 'bg-white/[0.02] border-white/10 hover:border-primary/30 hover:bg-white/[0.05]'
                                        }
                                    `}
                >
                  <div className="flex flex-col items-center justify-center min-w-[45px] py-1 border-r border-white/5 pr-4">
                    <span className="text-[10px] uppercase font-black text-slate-500">
                      {format(eventDate, 'MMM', { locale: es })}
                    </span>
                    <span
                      className={`text-xl font-bold leading-none ${isToday ? 'text-primary' : 'text-white'}`}
                    >
                      {format(eventDate, 'd')}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-slate-500 truncate uppercase tracking-wide">
                        {event.type}
                      </span>
                      <div className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <Clock size={10} />
                        {event.time || '14:00'}
                      </span>
                    </div>
                    <div className="font-bold text-slate-100/90 group-hover:text-white transition-colors truncate">
                      {event.name}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <PAXBadge count={event.pax} />
                    {event.menuId ? (
                      <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10 uppercase tracking-tighter">
                        <CheckCircle2 size={10} /> LISTO
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/10 uppercase tracking-tighter">
                        <AlertCircle size={10} /> SIN MENÚ
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
