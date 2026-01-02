import { useState, type FC, useMemo } from 'react';
import {
  X,
  Calendar,
  Users,
  Plus,
  FileText,
  Trash2,
  Brain,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Utensils,
  Info,
  Printer,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Event, EventType, SportsMenuData } from '@/types';
import { SportsMenuScanner } from '../scanner/SportsMenuScanner';
import { useStore } from '@/presentation/store/useStore';

interface DayDetailsModalProps {
  date: Date;
  events: Event[];
  onClose: () => void;
  onAddEvent: () => void;
  onEditEvent?: (event: Event) => void;
  onOpenProduction?: (event: Event) => void;
  onDeleteEvent?: (id: string) => void;
}

const eventColors: Record<EventType, string> = {
  Comida: 'bg-orange-500/20 text-orange-300 border-orange-500/50',
  Cena: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50',
  Coctel: 'bg-pink-500/20 text-pink-300 border-pink-500/50',
  Empresa: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
  Mediodia: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
  Noche: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
  'Equipo Deportivo': 'bg-green-500/20 text-green-300 border-green-500/50',
  'Coffee Break': 'bg-stone-500/20 text-stone-300 border-stone-500/50',
  Boda: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
  Otros: 'bg-gray-500/20 text-gray-300 border-gray-500/50',
};

// --- Helper Components ---

const AccordionItem: FC<{
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}> = ({ title, icon, children, defaultOpen = false, className = '' }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`border border-white/5 rounded-xl overflow-hidden bg-white/[0.02] ${className}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
        type="button"
      >
        <div className="flex items-center gap-2.5">
          {icon && <div className="text-slate-400">{icon}</div>}
          <span className="text-sm font-bold text-slate-200 uppercase tracking-wide">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>
      {isOpen && <div className="p-4 pt-0 border-t border-white/5 mt-3">{children}</div>}
    </div>
  );
};

const TooltipButton: FC<{
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}> = ({ title, onClick, children, className }) => (
  <div className="relative group/tooltip">
    <button onClick={onClick} className={className}>
      {children}
    </button>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[10px] font-bold rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
      {title}
    </div>
  </div>
);

const Badge: FC<{
  color?: 'green' | 'yellow' | 'red' | 'gray' | 'blue';
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ color = 'gray', children, icon }) => {
  const colors = {
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    yellow: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    gray: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${colors[color]}`}
    >
      {icon}
      <span className="text-[10px] font-black uppercase tracking-wider">{children}</span>
    </div>
  );
};

const EventCardDetail: FC<{
  event: Event;
  onEdit?: () => void;
  onDelete?: () => void;
  onOpenProduction?: () => void;
  onScanAI?: () => void;
}> = ({ event, onEdit, onDelete, onOpenProduction, onScanAI }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Parse notes to formatted markdown-ish
  const formattedNotes = useMemo(() => {
    if (!event.notes) return null;
    return event.notes.split('\n').map((line, i) => {
      if (line.startsWith('- ')) {
        return (
          <li key={i} className="ml-4 list-disc pl-1 mb-1 text-slate-300">
            {line.substring(2)}
          </li>
        );
      }
      if (line.startsWith('---')) {
        return <div key={i} className="my-3 border-t border-dashed border-white/20" />;
      }
      if (line.startsWith('[') && line.includes(']')) {
        return (
          <h5 key={i} className="text-primary font-bold mt-3 mb-1 uppercase text-xs">
            {line}
          </h5>
        );
      }
      return (
        <p key={i} className="mb-1 text-slate-400">
          {line}
        </p>
      );
    });
  }, [event.notes]);

  return (
    <div className="bg-[#12161f] border border-white/5 rounded-2xl overflow-hidden shadow-lg mb-4">
      {/* Header Card */}
      <div className="p-5 border-b border-white/5 relative overflow-hidden">
        <div
          className={`absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl rounded-full translate-x-10 -translate-y-10 ${(eventColors[event.type] || '').split(' ')[0]?.replace('/20', '')}`}
        />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-3">
            <div className="space-y-1">
              <span
                className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border mb-2 ${eventColors[event.type]}`}
              >
                {event.type}
              </span>
              <h3 className="text-2xl font-bold text-white tracking-tight leading-none">
                {event.name}
              </h3>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  <strong className="text-slate-200">{event.pax}</strong> PAX
                </span>
                <span>•</span>
                <span className="uppercase font-medium tracking-wide">
                  {event.room || 'Sin salón asignado'}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Badge color="yellow" icon={<AlertTriangle size={10} />}>
                Saldo No Especificado
              </Badge>
              <div className="text-[10px] font-mono opacity-30">ID: {event.id.slice(0, 6)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Menu Section */}
        {event.menu ? (
          <AccordionItem title="Menú Seleccionado" icon={<Utensils size={16} />} defaultOpen>
            <div className="bg-white/5 rounded-lg p-3 border border-white/5">
              <h4 className="font-bold text-white mb-1">{event.menu.name}</h4>
              {event.menu.description && (
                <p className="text-xs text-slate-400 leading-relaxed">{event.menu.description}</p>
              )}
            </div>
          </AccordionItem>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-white/10 flex items-center justify-center gap-2 text-slate-500">
            <Info size={16} />
            <span className="text-xs font-bold uppercase tracking-wide">Sin menú seleccionado</span>
          </div>
        )}

        {/* Notes & Details */}
        {event.notes && (
          <AccordionItem title="Detalles y Logística" icon={<FileText size={16} />}>
            <div className="text-sm space-y-1">{formattedNotes}</div>
          </AccordionItem>
        )}
      </div>

      {/* Footer Actions */}
      <div className="bg-white/5 border-t border-white/5 p-3 flex items-center gap-2">
        {onOpenProduction && (
          <TooltipButton
            title="Ver en Pantalla de Producción (KDS)"
            className="flex-1"
            onClick={onOpenProduction}
          >
            <div className="w-full bg-[#1a2234] hover:bg-[#232d42] border border-white/10 text-slate-200 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">
              <Users size={14} /> Producción
            </div>
          </TooltipButton>
        )}

        {event.type === 'Equipo Deportivo' && onScanAI && (
          <TooltipButton
            title="Escanear Hoja de Servicio con AI"
            className="flex-1"
            onClick={onScanAI}
          >
            <div className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">
              <Brain size={14} /> AI Scan
            </div>
          </TooltipButton>
        )}

        <div className="w-px h-8 bg-white/10 mx-1" />

        {onEdit && (
          <TooltipButton title="Editar Evento" onClick={onEdit}>
            <div className="p-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors">
              <FileText size={16} />
            </div>
          </TooltipButton>
        )}

        <TooltipButton title="Imprimir Evento">
          <div className="p-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors">
            <Printer size={16} />
          </div>
        </TooltipButton>

        {onDelete && (
          <div className="relative">
            {confirmDelete ? (
              <div className="absolute bottom-full right-0 mb-2 flex items-center gap-1 bg-red-900/90 p-1.5 rounded-lg border border-red-500/20 backdrop-blur-md">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="px-3 py-1 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="p-1 hover:bg-white/10 rounded text-slate-300"
                >
                  <X size={12} />
                </button>
              </div>
            ) : null}
            <TooltipButton title="Eliminar Evento" onClick={() => setConfirmDelete(true)}>
              <div
                className={`p-2.5 rounded-lg transition-colors ${confirmDelete ? 'bg-red-500/20 text-red-400' : 'bg-white/5 hover:bg-red-500/10 text-slate-300 hover:text-red-400'}`}
              >
                <Trash2 size={16} />
              </div>
            </TooltipButton>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Modal ---

export const DayDetailsModal: FC<DayDetailsModalProps> = ({
  date,
  events,
  onClose,
  onAddEvent,
  onEditEvent,
  onOpenProduction,
  onDeleteEvent,
}) => {
  const { updateEvent } = useStore();
  const [scanningEventId, setScanningEventId] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#0a0e14] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#161b26]">
          <div className="flex items-center gap-4">
            <div className="bg-primary/20 text-primary p-3 rounded-xl border border-primary/20 shadow-inner">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white capitalize tracking-tight">
                {format(date, 'EEEE, d MMMM', { locale: es })}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {events.length} {events.length === 1 ? 'Evento' : 'Eventos'}
                </span>
                {events.length > 0 && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/10 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                    <Users size={10} />
                    {events.reduce((acc, e) => acc + e.pax, 0)} PAX Total
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#0f1218]">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <Calendar className="w-16 h-16 opacity-20 mb-4" />
              <p className="text-sm font-medium">No hay eventos para este día.</p>
              <button
                onClick={onAddEvent}
                className="mt-4 text-primary hover:underline text-xs font-bold uppercase tracking-wider"
              >
                Crear primer evento
              </button>
            </div>
          ) : (
            events.map((event) => (
              <EventCardDetail
                key={event.id}
                event={event}
                onEdit={onEditEvent ? () => onEditEvent(event) : undefined}
                onDelete={onDeleteEvent ? () => onDeleteEvent(event.id) : undefined}
                onOpenProduction={onOpenProduction ? () => onOpenProduction(event) : undefined}
                onScanAI={
                  event.type === 'Equipo Deportivo' ? () => setScanningEventId(event.id) : undefined
                }
              />
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-white/10 bg-[#161b26] shrink-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 py-3.5 rounded-xl font-bold transition-colors uppercase tracking-wider text-xs"
          >
            Cerrar
          </button>
          <button
            onClick={onAddEvent}
            className="flex-[2] bg-primary hover:bg-blue-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 uppercase tracking-wider text-xs"
          >
            <Plus className="w-4 h-4" /> Nuevo Evento
          </button>
        </div>
      </div>

      {scanningEventId && (
        <SportsMenuScanner
          event={events.find((e) => e.id === scanningEventId)!}
          onClose={() => setScanningEventId(null)}
          onScanComplete={async (data: SportsMenuData) => {
            const event = events.find((e) => e.id === scanningEventId);
            if (event) {
              // Extract structured text for notes
              const coursesText =
                data.courses
                  ?.map((c) => {
                    const category = (c.category || 'Sin Categoría').toUpperCase();
                    const items =
                      c.items
                        ?.map(
                          (i) =>
                            `- ${i.name || 'Sin nombre'}${i.notes ? ` (${i.notes})` : ''}${i.quantity ? ` [${i.quantity}]` : ''}${i.isHandwritten ? ' ✍️' : ''}`
                        )
                        .join('\n') || 'Sin platos';
                    return `[${category}]\n${items}`;
                  })
                  .join('\n\n') || '';

              const finalNotes = `--- MENÚ ESCANEADO AI (${data.mealType}) ---\n${coursesText}\n\nNOTAS GLOBALES: ${data.globalNotes || 'N/A'}\nNOTAS MANUSCRITAS: ${data.handwrittenTranscriptions || 'N/A'}\n\n${event.notes || ''}`;

              await updateEvent({
                ...event,
                notes: finalNotes,
              });
            }
            setScanningEventId(null);
          }}
        />
      )}
    </div>
  );
};
