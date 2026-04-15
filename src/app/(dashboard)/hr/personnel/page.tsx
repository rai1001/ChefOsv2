'use client'

import { useState } from 'react'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import {
  usePersonnel,
  useCreatePersonnel,
  useUpdatePersonnel,
} from '@/features/hr/hooks/use-hr'
import {
  Personnel,
  PersonnelRole,
  ContractType,
  PERSONNEL_ROLES,
  PERSONNEL_ROLE_LABELS,
  CONTRACT_TYPE_LABELS,
} from '@/features/hr/types'
import { UserPlus, Pencil, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

// ──────────────────────────────────────────
// Formulario create / edit
// ──────────────────────────────────────────

interface PersonnelFormState {
  name: string
  role: PersonnelRole
  contract_type: ContractType
  weekly_hours: string
  active: boolean
  notes: string
}

const EMPTY: PersonnelFormState = {
  name: '',
  role: 'cocinero',
  contract_type: 'indefinido',
  weekly_hours: '40',
  active: true,
  notes: '',
}

const CONTRACT_TYPES: ContractType[] = [
  'indefinido', 'temporal', 'formacion', 'autonomo', 'becario',
]

function PersonnelModal({
  initial,
  onClose,
  onSave,
  loading,
  error,
}: {
  initial: PersonnelFormState
  onClose: () => void
  onSave: (d: PersonnelFormState) => void
  loading: boolean
  error: string
}) {
  const [form, setForm] = useState<PersonnelFormState>(initial)
  const isEdit = initial.name !== ''

  function set<K extends keyof PersonnelFormState>(k: K, v: PersonnelFormState[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-base font-semibold text-text-primary">
          {isEdit ? 'Editar empleado' : 'Nuevo empleado'}
        </h2>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('name', e.target.value)}
              placeholder="Nombre completo"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-input focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Rol principal</label>
              <select
                value={form.role}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('role', e.target.value as PersonnelRole)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-input focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {PERSONNEL_ROLES.map(r => (
                  <option key={r} value={r}>{PERSONNEL_ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Contrato</label>
              <select
                value={form.contract_type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('contract_type', e.target.value as ContractType)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-input focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {CONTRACT_TYPES.map(c => (
                  <option key={c} value={c}>{CONTRACT_TYPE_LABELS[c]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Horas semanales objetivo
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={form.weekly_hours}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('weekly_hours', e.target.value)}
              className="w-28 border border-border rounded-lg px-3 py-2 text-sm bg-bg-input focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Notas (opcional)
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set('notes', e.target.value)}
              placeholder="Disponibilidad, restricciones…"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-input focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>

          {isEdit && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('active', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-text-secondary">Activo</span>
            </label>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 border border-border rounded-xl text-sm hover:bg-bg-hover disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={loading || !form.name.trim()}
            className="flex-1 py-2 bg-gray-900 text-white rounded-xl text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
// Página
// ──────────────────────────────────────────

export default function PersonnelPage() {
  const { data: hotel } = useActiveHotel()
  const hotelId = hotel?.hotel_id ?? ''

  const { data: personnel = [], isLoading } = usePersonnel(hotelId)
  const createMut = useCreatePersonnel(hotelId)
  const updateMut = useUpdatePersonnel(hotelId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Personnel | null>(null)
  const [filter, setFilter]         = useState('')
  const [savingError, setSavingError] = useState('')

  function openNew() { setEditTarget(null); setDialogOpen(true); setSavingError('') }
  function openEdit(p: Personnel) { setEditTarget(p); setDialogOpen(true); setSavingError('') }
  function closeDialog() { setDialogOpen(false); setEditTarget(null); setSavingError('') }

  async function handleSave(form: PersonnelFormState) {
    setSavingError('')
    const hours = parseFloat(form.weekly_hours)
    try {
      if (editTarget) {
        await updateMut.mutateAsync({
          id:            editTarget.id,
          name:          form.name,
          role:          form.role,
          contract_type: form.contract_type,
          weekly_hours:  hours,
          active:        form.active,
          notes:         form.notes || undefined,
        })
      } else {
        await createMut.mutateAsync({
          name:          form.name,
          role:          form.role,
          contract_type: form.contract_type,
          weekly_hours:  hours,
          notes:         form.notes || undefined,
        })
      }
      closeDialog()
    } catch (err) {
      setSavingError((err as Error).message)
    }
  }

  const initialForm: PersonnelFormState = editTarget
    ? {
        name:          editTarget.name,
        role:          editTarget.role,
        contract_type: editTarget.contract_type,
        weekly_hours:  String(editTarget.weekly_hours),
        active:        editTarget.active,
        notes:         editTarget.notes ?? '',
      }
    : EMPTY

  const filtered = personnel.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    PERSONNEL_ROLE_LABELS[p.role].toLowerCase().includes(filter.toLowerCase())
  )

  const total  = personnel.length
  const active = personnel.filter(p => p.active).length

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-text-muted" />
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Personal</h1>
            <p className="text-sm text-text-muted mt-0.5">
              {active} activo{active !== 1 ? 's' : ''} · {total} total
            </p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm hover:bg-gray-800"
        >
          <UserPlus className="h-4 w-4" />
          Nuevo empleado
        </button>
      </div>

      {/* Buscador */}
      <input
        type="text"
        placeholder="Buscar por nombre o rol…"
        value={filter}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter(e.target.value)}
        className="w-full max-w-sm border border-border rounded-lg px-3 py-2 text-sm bg-bg-input focus:outline-none focus:ring-2 focus:ring-gray-900"
      />

      {/* Tabla */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-bg-hover rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted gap-2">
          <Users className="h-10 w-10 opacity-30" />
          <p className="text-sm">
            {personnel.length === 0
              ? 'Aún no hay personal registrado. Añade tu primer empleado.'
              : 'Sin resultados para la búsqueda.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-hover border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Rol</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary hidden md:table-cell">Contrato</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">H/semana</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Estado</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{p.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{PERSONNEL_ROLE_LABELS[p.role]}</td>
                  <td className="px-4 py-3 text-text-muted hidden md:table-cell">
                    {CONTRACT_TYPE_LABELS[p.contract_type]}
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary">{p.weekly_hours}h</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      p.active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    )}>
                      {p.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted"
                      title="Editar"
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

      {/* Modal */}
      {dialogOpen && (
        <PersonnelModal
          initial={initialForm}
          onClose={closeDialog}
          onSave={handleSave}
          loading={createMut.isPending || updateMut.isPending}
          error={savingError}
        />
      )}
    </div>
  )
}
