'use client'

import { useState, useMemo } from 'react'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import {
  usePersonnel,
  useShiftDefinitions,
  useScheduleRules,
  useScheduleAssignments,
  useGenerateMonthlySchedule,
  useCreateShiftDefinition,
  useUpdateShiftDefinition,
  useCreateScheduleRule,
  useUpdateScheduleRule,
  useDeleteScheduleRule,
  useUpdateAssignment,
} from '@/features/hr/hooks/use-hr'
import {
  ShiftDefinition,
  ScheduleRule,
  ScheduleAssignment,
  PersonnelRole,
  ShiftType,
  PERSONNEL_ROLES,
  PERSONNEL_ROLE_LABELS,
  SHIFT_TYPE_LABELS,
  DAY_SHORT_LABELS,
  formatTime,
  shiftDurationHours,
} from '@/features/hr/types'
import { ChevronLeft, ChevronRight, Calendar, Plus, Pencil, Trash2, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ──────────────────────────────────────────
// Helpers de fecha
// ──────────────────────────────────────────

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('es-ES', {
    month: 'long', year: 'numeric',
  })
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isodow(year: number, month: number, day: number): number {
  const d = new Date(year, month - 1, day).getDay()
  return d === 0 ? 7 : d
}

function cellColor(status: string): string {
  if (status === 'confirmado') return 'bg-success text-white'
  if (status === 'cancelado')  return 'bg-danger/80 text-text-primary line-through opacity-60'
  return 'bg-border text-text-secondary'
}

// ──────────────────────────────────────────
// TAB 1 — Cuadrante mensual
// ──────────────────────────────────────────

function ScheduleGrid({ hotelId }: { hotelId: string }) {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [genError, setGenError] = useState('')

  const dateFrom = isoDate(year, month, 1)
  const dateTo   = isoDate(year, month, daysInMonth(year, month))

  const { data: personnel = [], isLoading: loadingP } = usePersonnel(hotelId, true)
  const { data: assignments = [], isLoading: loadingA } = useScheduleAssignments(hotelId, dateFrom, dateTo)
  const generateMut = useGenerateMonthlySchedule(hotelId)
  const updateMut   = useUpdateAssignment(hotelId)

  // personnelId → dateStr → ScheduleAssignment[]
  const grid = useMemo(() => {
    const m = new Map<string, Map<string, ScheduleAssignment[]>>()
    for (const a of assignments) {
      if (!m.has(a.personnel_id)) m.set(a.personnel_id, new Map())
      const bd = m.get(a.personnel_id)!
      if (!bd.has(a.work_date)) bd.set(a.work_date, [])
      bd.get(a.work_date)!.push(a)
    }
    return m
  }, [assignments])

  const days     = daysInMonth(year, month)
  const dayArray = Array.from({ length: days }, (_, i) => i + 1)

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  async function handleGenerate() {
    setGenError('')
    try {
      const n = await generateMut.mutateAsync({ year, month })
      if (n === 0) setGenError('No se generaron asignaciones. Comprueba que hay turnos, reglas y personal activo.')
    } catch (err) {
      setGenError((err as Error).message)
    }
  }

  async function cycleStatus(a: ScheduleAssignment) {
    const next = a.status === 'propuesto' ? 'confirmado'
               : a.status === 'confirmado' ? 'cancelado'
               : 'propuesto'
    await updateMut.mutateAsync({ id: a.id, status: next as ScheduleAssignment['status'] })
  }

  if (loadingP || loadingA) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 skeleton rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg border border-border hover:bg-bg-hover text-text-secondary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium capitalize w-44 text-center text-text-primary">
            {monthLabel(year, month)}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg border border-border hover:bg-bg-hover text-text-secondary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generateMut.isPending}
          className="flex items-center gap-2 border border-border rounded-md px-3 py-2 text-sm hover:bg-bg-hover disabled:opacity-50"
        >
          <Wand2 className="h-4 w-4" />
          {generateMut.isPending ? 'Generando…' : 'Generar mes'}
        </button>
      </div>

      {genError && (
        <p className="text-xs text-warning bg-bg-card border border-warning/40 rounded-lg px-3 py-2">
          {genError}
        </p>
      )}

      {/* Leyenda */}
      <div className="flex gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-border" /> Propuesto
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-success" /> Confirmado
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-danger/80" /> Cancelado
        </span>
        <span>· Clic en celda para cambiar estado</span>
      </div>

      {personnel.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm">
          Añade personal activo antes de generar el cuadrante.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-bg-hover">
                <th className="sticky left-0 bg-bg-hover px-3 py-2 text-left font-medium text-text-secondary min-w-36 z-10 border-r border-border">
                  Empleado
                </th>
                {dayArray.map(d => {
                  const dow     = isodow(year, month, d)
                  const weekend = dow >= 6
                  return (
                    <th
                      key={d}
                      className={cn(
                        'px-1 py-2 text-center font-medium min-w-10',
                        weekend ? 'text-text-muted' : 'text-text-secondary'
                      )}
                    >
                      <div>{d}</div>
                      <div className="font-normal opacity-60">{DAY_SHORT_LABELS[dow]}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {personnel.map((person, idx) => {
                const byDate = grid.get(person.id)
                const rowBg  = idx % 2 === 0 ? 'bg-bg-card' : 'bg-bg-hover/40'
                return (
                  <tr key={person.id} className={cn('border-t border-border', rowBg)}>
                    <td className={cn(
                      'sticky left-0 px-3 py-1.5 z-10 border-r border-border',
                      rowBg
                    )}>
                      <div className="font-medium text-text-primary">{person.name}</div>
                      <div className="text-text-muted text-[10px]">
                        {PERSONNEL_ROLE_LABELS[person.role]}
                      </div>
                    </td>
                    {dayArray.map(d => {
                      const dateStr  = isoDate(year, month, d)
                      const cellList = byDate?.get(dateStr) ?? []
                      const weekend  = isodow(year, month, d) >= 6
                      return (
                        <td
                          key={d}
                          className={cn('px-0.5 py-1 text-center align-middle', weekend && 'opacity-70')}
                        >
                          {cellList.length === 0 ? (
                            <span className="text-text-muted opacity-30">–</span>
                          ) : (
                            <div className="space-y-0.5">
                              {cellList.map(a => (
                                <button
                                  key={a.id}
                                  title={`${a.shift_name} (${formatTime(a.shift_start)}–${formatTime(a.shift_end)}) · ${a.status}`}
                                  onClick={() => cycleStatus(a)}
                                  className={cn(
                                    'block w-full rounded px-1 py-0.5 text-[10px] leading-tight cursor-pointer hover:opacity-80 transition-opacity',
                                    cellColor(a.status)
                                  )}
                                >
                                  {a.shift_name.slice(0, 3).toUpperCase()}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────
// TAB 2 — Turnos
// ──────────────────────────────────────────

const SHIFT_TYPES: ShiftType[] = ['normal', 'refuerzo', 'evento']

interface ShiftFormState {
  name: string
  start_time: string
  end_time: string
  shift_type: ShiftType
}

function ShiftModal({
  initial,
  onClose,
  onSave,
  loading,
  error,
}: {
  initial: ShiftFormState
  onClose: () => void
  onSave: (d: ShiftFormState) => void
  loading: boolean
  error: string
}) {
  const [form, setForm] = useState<ShiftFormState>(initial)
  const isEdit = !!initial.name

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-text-primary">
          {isEdit ? 'Editar turno' : 'Nuevo turno'}
        </h2>

        {error && (
          <p className="text-xs text-danger bg-bg-card border border-danger/40 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej. Mañana, Tarde, Noche…"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-input focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Inicio</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, start_time: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-input focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Fin</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, end_time: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-input focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Tipo</label>
            <select
              value={form.shift_type}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, shift_type: e.target.value as ShiftType }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-input focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {SHIFT_TYPES.map(t => (
                <option key={t} value={t}>{SHIFT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2 border border-border rounded-md text-sm hover:bg-bg-hover disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={loading || !form.name.trim()}
            className="flex-1 py-2 bg-accent text-white rounded-md text-sm hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ShiftsTab({ hotelId }: { hotelId: string }) {
  const { data: shifts = [], isLoading } = useShiftDefinitions(hotelId)
  const createMut = useCreateShiftDefinition(hotelId)
  const updateMut = useUpdateShiftDefinition(hotelId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ShiftDefinition | null>(null)
  const [saveError, setSaveError]   = useState('')

  function openNew()                 { setEditTarget(null); setDialogOpen(true); setSaveError('') }
  function openEdit(s: ShiftDefinition) { setEditTarget(s); setDialogOpen(true); setSaveError('') }
  function close()                   { setDialogOpen(false); setEditTarget(null); setSaveError('') }

  async function handleSave(form: ShiftFormState) {
    setSaveError('')
    try {
      if (editTarget) {
        await updateMut.mutateAsync({
          id:         editTarget.id,
          name:       form.name,
          start_time: form.start_time + ':00',
          end_time:   form.end_time   + ':00',
          shift_type: form.shift_type,
        })
      } else {
        await createMut.mutateAsync({
          name:       form.name,
          start_time: form.start_time + ':00',
          end_time:   form.end_time   + ':00',
          shift_type: form.shift_type,
        })
      }
      close()
    } catch (err) {
      setSaveError((err as Error).message)
    }
  }

  const initial: ShiftFormState = editTarget
    ? {
        name:       editTarget.name,
        start_time: formatTime(editTarget.start_time),
        end_time:   formatTime(editTarget.end_time),
        shift_type: editTarget.shift_type,
      }
    : { name: '', start_time: '08:00', end_time: '16:00', shift_type: 'normal' }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={openNew}
          className="flex items-center gap-2 border border-border rounded-md px-3 py-2 text-sm hover:bg-bg-hover"
        >
          <Plus className="h-4 w-4" /> Nuevo turno
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 skeleton rounded-lg" />
          ))}
        </div>
      ) : shifts.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm">
          Sin turnos definidos. Crea al menos un turno para poder generar horarios.
        </div>
      ) : (
        <div className="rounded-md border border-border bg-bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-hover border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Horario</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Duración</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Activo</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shifts.map(s => (
                <tr key={s.id} className="hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{s.name}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {formatTime(s.start_time)} – {formatTime(s.end_time)}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {shiftDurationHours(s.start_time, s.end_time)}h
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-bg-hover text-text-secondary">
                      {SHIFT_TYPE_LABELS[s.shift_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => updateMut.mutate({ id: s.id, active: !s.active })}
                      className={cn(
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                        s.active ? 'bg-success' : 'bg-border'
                      )}
                    >
                      <span className={cn(
                        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-bg-card shadow ring-0 transition-transform',
                        s.active ? 'translate-x-4' : 'translate-x-0'
                      )} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(s)}
                      className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <ShiftModal
          initial={initial}
          onClose={close}
          onSave={handleSave}
          loading={createMut.isPending || updateMut.isPending}
          error={saveError}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────
// TAB 3 — Reglas de horario
// ──────────────────────────────────────────

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]

interface RuleFormState {
  role: PersonnelRole
  days_of_week: number[]
  shift_id: string
  min_persons: string
  priority: 'normal' | 'alta'
}

function RuleModal({
  shifts,
  onClose,
  onSave,
  loading,
  error,
}: {
  shifts: ShiftDefinition[]
  onClose: () => void
  onSave: (d: RuleFormState) => void
  loading: boolean
  error: string
}) {
  const [form, setForm] = useState<RuleFormState>({
    role: 'cocinero',
    days_of_week: [1, 2, 3, 4, 5],
    shift_id: '',
    min_persons: '1',
    priority: 'normal',
  })

  function toggleDay(d: number) {
    setForm(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(d)
        ? prev.days_of_week.filter(x => x !== d)
        : [...prev.days_of_week, d].sort(),
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-text-primary">Nueva regla de horario</h2>

        {error && (
          <p className="text-xs text-danger bg-bg-card border border-danger/40 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Rol</label>
            <select
              value={form.role}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, role: e.target.value as PersonnelRole }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-input focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {PERSONNEL_ROLES.map(r => (
                <option key={r} value={r}>{PERSONNEL_ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">Días</label>
            <div className="flex gap-1.5">
              {WEEKDAYS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={cn(
                    'w-8 h-8 rounded text-xs font-medium transition-colors',
                    form.days_of_week.includes(d)
                      ? 'bg-accent text-white'
                      : 'bg-bg-hover text-text-secondary hover:bg-border'
                  )}
                >
                  {DAY_SHORT_LABELS[d]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Turno</label>
            <select
              value={form.shift_id}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, shift_id: e.target.value }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-input focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Seleccionar turno…</option>
              {shifts.filter(s => s.active).map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({formatTime(s.start_time)}–{formatTime(s.end_time)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Personas mínimas</label>
              <input
                type="number"
                min={1}
                value={form.min_persons}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, min_persons: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-input focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Prioridad</label>
              <select
                value={form.priority}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, priority: e.target.value as 'normal' | 'alta' }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-input focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2 border border-border rounded-md text-sm hover:bg-bg-hover disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={loading || !form.shift_id || form.days_of_week.length === 0}
            className="flex-1 py-2 bg-accent text-white rounded-md text-sm hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? 'Guardando…' : 'Crear regla'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RulesTab({ hotelId }: { hotelId: string }) {
  const { data: rules = [],  isLoading: loadingR } = useScheduleRules(hotelId)
  const { data: shifts = [], isLoading: loadingS } = useShiftDefinitions(hotelId)
  const createMut = useCreateScheduleRule(hotelId)
  const updateMut = useUpdateScheduleRule(hotelId)
  const deleteMut = useDeleteScheduleRule(hotelId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saveError, setSaveError]   = useState('')

  async function handleSave(form: RuleFormState) {
    setSaveError('')
    try {
      await createMut.mutateAsync({
        role:         form.role,
        days_of_week: form.days_of_week,
        shift_id:     form.shift_id,
        min_persons:  parseInt(form.min_persons, 10) || 1,
        priority:     form.priority,
      })
      setDialogOpen(false)
    } catch (err) {
      setSaveError((err as Error).message)
    }
  }

  async function handleDelete(r: ScheduleRule) {
    try {
      await deleteMut.mutateAsync(r.id)
    } catch (err) {
      console.error(err)
    }
  }

  if (loadingR || loadingS) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 skeleton rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setSaveError(''); setDialogOpen(true) }}
          className="flex items-center gap-2 border border-border rounded-md px-3 py-2 text-sm hover:bg-bg-hover"
        >
          <Plus className="h-4 w-4" /> Nueva regla
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm">
          Sin reglas. Define reglas para que el sistema pueda generar el cuadrante automáticamente.
        </div>
      ) : (
        <div className="rounded-md border border-border bg-bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-hover border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Rol</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Días</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Turno</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Mín.</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Prio.</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Activa</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rules.map(r => (
                <tr key={r.id} className="hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {PERSONNEL_ROLE_LABELS[r.role]}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-0.5">
                      {WEEKDAYS.map(d => (
                        <span
                          key={d}
                          className={cn(
                            'text-[10px] w-5 h-5 rounded flex items-center justify-center font-medium',
                            r.days_of_week.includes(d)
                              ? 'bg-accent text-white'
                              : 'bg-bg-hover text-text-muted'
                          )}
                        >
                          {DAY_SHORT_LABELS[d]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {r.shift_name} ({formatTime(r.shift_start)}–{formatTime(r.shift_end)})
                  </td>
                  <td className="px-4 py-3 text-text-muted">{r.min_persons}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      r.priority === 'alta'
                        ? 'bg-amber-100 text-warning'
                        : 'bg-bg-hover text-text-muted'
                    )}>
                      {r.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => updateMut.mutate({ id: r.id, active: !r.active })}
                      className={cn(
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                        r.active ? 'bg-success' : 'bg-border'
                      )}
                    >
                      <span className={cn(
                        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-bg-card shadow ring-0 transition-transform',
                        r.active ? 'translate-x-4' : 'translate-x-0'
                      )} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(r)}
                      disabled={deleteMut.isPending}
                      className="p-1.5 rounded-lg hover:bg-bg-hover text-danger/80 hover:text-danger disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <RuleModal
          shifts={shifts}
          onClose={() => setDialogOpen(false)}
          onSave={handleSave}
          loading={createMut.isPending}
          error={saveError}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────
// Página principal con tabs
// ──────────────────────────────────────────

type Tab = 'schedule' | 'shifts' | 'rules'

export default function SchedulePage() {
  const { data: hotel } = useActiveHotel()
  const hotelId = hotel?.hotel_id ?? ''
  const [tab, setTab] = useState<Tab>('schedule')

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Calendar className="h-6 w-6 text-text-muted" />
        <div>
          <h1 className="text-text-primary">Horarios</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Cuadrante mensual · Turnos · Reglas de generación
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-md border border-border w-fit">
        {(['schedule', 'shifts', 'rules'] as Tab[]).map((t, i) => {
          const labels: Record<Tab, string> = {
            schedule: 'Cuadrante',
            shifts:   'Turnos',
            rules:    'Reglas',
          }
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 text-sm transition-colors',
                i > 0 && 'border-l border-border',
                tab === t
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:bg-bg-hover'
              )}
            >
              {labels[t]}
            </button>
          )
        })}
      </div>

      {/* Contenido */}
      {tab === 'schedule' && <ScheduleGrid hotelId={hotelId} />}
      {tab === 'shifts'   && <ShiftsTab   hotelId={hotelId} />}
      {tab === 'rules'    && <RulesTab    hotelId={hotelId} />}
    </div>
  )
}
