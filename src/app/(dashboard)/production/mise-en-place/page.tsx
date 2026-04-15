'use client'

import { useState } from 'react'
import { useWorkflows } from '@/features/production/hooks/use-workflows'
import { useMiseEnPlaceLists, useMiseEnPlaceItems, useMarkMiseEnPlaceItem } from '@/features/production/hooks/use-mise-en-place'
import { DEPARTMENT_LABELS, type Department, type MiseEnPlaceItem } from '@/features/production/types'
import { ChefHat, Check, Circle, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function MiseEnPlacePage() {
  const { data: workflows, isLoading: loadingWf } = useWorkflows()
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('')
  const [expandedList, setExpandedList] = useState<string | null>(null)

  const activeWorkflows = workflows?.filter((w) => w.status === 'active') ?? []
  const { data: lists, isLoading: loadingLists } = useMiseEnPlaceLists(selectedWorkflow || undefined)

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ChefHat className="h-6 w-6 text-accent" />
        <div>
          <h1 className="text-text-primary">Mise en place</h1>
          <p className="text-sm text-text-muted">Checklists de preparación por partida</p>
        </div>
      </div>

      {/* Selector de workflow */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
          Workflow activo
        </label>
        {loadingWf ? (
          <div className="h-10 rounded-lg bg-surface animate-pulse" />
        ) : activeWorkflows.length === 0 ? (
          <div className="text-sm text-text-muted py-2">
            No hay workflows activos. Genera uno desde el detalle de un evento.
          </div>
        ) : (
          <select
            value={selectedWorkflow}
            onChange={(e) => {
              setSelectedWorkflow(e.target.value)
              setExpandedList(null)
            }}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="">Selecciona un workflow...</option>
            {activeWorkflows.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Listas MeP */}
      {selectedWorkflow && loadingLists && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-surface animate-pulse" />)}
        </div>
      )}

      {selectedWorkflow && !loadingLists && lists?.length === 0 && (
        <div className="text-center py-10 text-text-muted text-sm">
          Este workflow no tiene listas de mise en place.
        </div>
      )}

      {lists && lists.length > 0 && (
        <div className="space-y-2">
          {lists.map((list) => (
            <MepListCard
              key={list.id}
              listId={list.id}
              department={list.department}
              title={list.title}
              isExpanded={expandedList === list.id}
              onToggle={() => setExpandedList(expandedList === list.id ? null : list.id)}
            />
          ))}
        </div>
      )}

      {!selectedWorkflow && (
        <div className="text-center py-16 text-text-muted">
          <ChefHat className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecciona un workflow para ver su mise en place</p>
        </div>
      )}
    </div>
  )
}

function MepListCard({
  listId,
  department,
  title,
  isExpanded,
  onToggle,
}: {
  listId: string
  department: Department
  title: string
  isExpanded: boolean
  onToggle: () => void
}) {
  const { data: items, isLoading } = useMiseEnPlaceItems(isExpanded ? listId : undefined)
  const markItem = useMarkMiseEnPlaceItem()

  const doneCount = items?.filter((i) => i.is_done).length ?? 0
  const totalCount = items?.length ?? 0

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-alt transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded
            ? <ChevronDown className="h-4 w-4 text-text-muted" />
            : <ChevronRight className="h-4 w-4 text-text-muted" />
          }
          <div className="text-left">
            <div className="text-sm font-medium text-text-primary">
              {DEPARTMENT_LABELS[department]}
            </div>
            <div className="text-xs text-text-muted">{title}</div>
          </div>
        </div>
        {isExpanded && items && (
          <span className={cn(
            'text-xs font-medium',
            doneCount === totalCount && totalCount > 0 ? 'text-success' : 'text-text-muted'
          )}>
            {doneCount}/{totalCount}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-border">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 rounded bg-surface-alt animate-pulse" />
              ))}
            </div>
          ) : items?.length === 0 ? (
            <div className="p-4 text-sm text-text-muted text-center">Sin ítems</div>
          ) : (
            <div className="divide-y divide-border">
              {items?.map((item) => (
                <MepItemRow
                  key={item.id}
                  item={item}
                  onToggle={() => markItem.mutate({ item_id: item.id, is_done: !item.is_done })}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MepItemRow({
  item,
  onToggle,
}: {
  item: MiseEnPlaceItem
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-alt',
        item.is_done && 'bg-success/5'
      )}
    >
      <div className={cn(
        'flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors',
        item.is_done
          ? 'border-success bg-success text-white'
          : 'border-border'
      )}>
        {item.is_done && <Check className="h-3 w-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <span className={cn(
          'text-sm',
          item.is_done ? 'line-through text-text-muted' : 'text-text-primary'
        )}>
          {item.description}
        </span>
        {item.quantity !== null && (
          <span className="text-xs text-text-muted ml-2">
            {item.quantity} {item.unit ?? ''}
          </span>
        )}
      </div>
    </button>
  )
}
