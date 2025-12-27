import React, { useMemo } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { format, isSameMonth, parseISO, isAfter, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MonthlyEventsWidget: React.FC = () => {
    const { events } = useStore();
    const navigate = useNavigate();
    const today = startOfDay(new Date());

    const monthlyEvents = useMemo(() => {
        const filtered = events.filter(e => isSameMonth(parseISO(e.date), today));

        // Group by Date + Name
        const groupedMap = new Map<string, any>();

        filtered.forEach(event => {
            const key = `${event.date}_${event.name.trim().toLowerCase()}`;
            if (groupedMap.has(key)) {
                const existing = groupedMap.get(key);
                existing.pax += event.pax;
                // Keep the first ID but maybe concatenate notes if needed? 
                // Mostly just summing PAX as requested.
            } else {
                groupedMap.set(key, { ...event });
            }
        });

        return Array.from(groupedMap.values())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [events, today]);

    return (
        <div className="glass-card p-0 flex flex-col h-full">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-surface/50">
                <h3 className="font-bold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-400" />
                    Eventos: {format(today, 'MMMM', { locale: es })}
                </h3>
                <button onClick={() => navigate('/events')} className="text-xs text-primary hover:text-primary/80">
                    Ver Calendario
                </button>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-2">
                {monthlyEvents.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                        <Calendar className="w-8 h-8 opacity-20" />
                        <p className="text-sm">Sin eventos este mes</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {monthlyEvents.map(event => {
                            const eventDate = parseISO(event.date);
                            const isPast = isAfter(today, eventDate); // Actually isAfter(today, date) means today > date => Past
                            const isToday = format(today, 'yyyy-MM-dd') === event.date;

                            return (
                                <div
                                    key={event.id}
                                    className={`p-3 rounded-lg border flex items-center gap-3 transition-colors
                                        ${isToday ? 'bg-amber-500/10 border-amber-500/30' :
                                            isPast ? 'bg-white/5 border-white/5 opacity-60' :
                                                'bg-surface border-white/10 hover:border-white/20'}
                                    `}
                                >
                                    <div className={`p-2 rounded-lg text-center min-w-[50px]
                                        ${isToday ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-slate-400'}
                                    `}>
                                        <div className="text-xs uppercase">{format(eventDate, 'MMM', { locale: es })}</div>
                                        <div className="text-xl font-bold leading-none">{format(eventDate, 'd')}</div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate text-slate-200">{event.name}</div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {event.pax} PAX
                                            </span>
                                            <span className="uppercase tracking-wider">{event.type}</span>
                                        </div>
                                    </div>

                                    {event.menu && (
                                        <div className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5 hidden sm:block">
                                            Menú Confirmado
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
