'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import {
  useKitchenOrders,
  useCreateKitchenOrder,
  useAddKitchenOrderItem,
  useUpdateKOItemStatus,
} from '@/features/production/hooks/use-kitchen-orders'
import {
  KO_STATUS_LABELS,
  KO_STATUS_COLORS,
  KO_ITEM_STATUS_LABELS,
  KO_ITEM_STATUS_COLORS,
  DEPARTMENT_LABELS,
  type Department,
  type KOItemStatus,
  type KitchenOrder,
} from '@/features/production/types'
import {
  ArrowLeft,
  Plus,
  Clock,
  CheckCircle,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEM_STATUS_SEQUENCE: KOItemStatus[] = ['pending', 'in_progress', 'ready']

export default function KDSPage({
  params,
}: {
  params: Promise<{ station: string }>
}) {
  const { station } = use(params)
  const dept = station as Department

  const { data: orders, isLoading } = useKitchenOrders(dept)
  const createOrder = useCreateKitchenOrder()
  const addItem = useAddKitchenOrderItem()
  const updateItem = useUpdateKOItemStatus()

  const [showNewOrder, setShowNewOrder] = useState(false)
  const [newItemTitle, setNewItemTitle] = useState('')
  const [newItemServings, setNewItemServings] = useState(1)
  const [addingToOrder, setAddingToOrder] = useState<string | null>(null)

  const handleCreateOrder = async () => {
    await createOrder.mutateAsync({ station: dept })
    setShowNewOrder(false)
  }

  const handleAddItem = async (orderId: string) => {
    if (!newItemTitle.trim()) return
    await addItem.mutateAsync({
      order_id: orderId,
      title: newItemTitle,
      servings: newItemServings,
    })
    setNewItemTitle('')
    setNewItemServings(1)
    setAddingToOrder(null)
  }

  const nextStatus = (current: KOItemStatus): KOItemStatus | null => {
    const idx = ITEM_STATUS_SEQUENCE.indexOf(current)
    return idx >= 0 && idx < ITEM_STATUS_SEQUENCE.length - 1
      ? ITEM_STATUS_SEQUENCE[idx + 1]
      : null
  }

  const activeOrders = orders?.filter((o) => o.status !== 'delivered') ?? []

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/production" className="text-text-muted hover:text-text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              KDS — {DEPARTMENT_LABELS[dept] ?? dept}
            </h1>
            <p className="text-xs text-text-muted">
              Actualización automática cada 10s
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowNewOrder(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" />
          Nueva comanda
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-surface animate-pulse" />
          ))}
        </div>
      ) : activeOrders.length === 0 ? (
        <div className="text-center py-20 text-text-muted">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sin comandas activas para esta partida</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onItemAdvance={(itemId, current) => {
                const next = nextStatus(current)
                if (next) updateItem.mutate({ item_id: itemId, status: next })
              }}
              onAddItem={() => setAddingToOrder(order.id)}
              isAddingItem={addingToOrder === order.id}
              newItemTitle={newItemTitle}
              newItemServings={newItemServings}
              onNewItemTitleChange={setNewItemTitle}
              onNewItemServingsChange={setNewItemServings}
              onConfirmAddItem={() => handleAddItem(order.id)}
              onCancelAddItem={() => setAddingToOrder(null)}
            />
          ))}
        </div>
      )}

      {/* Modal nueva comanda */}
      {showNewOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl border border-border bg-background p-5 w-full max-w-sm space-y-4">
            <h2 className="text-sm font-semibold text-text-primary">
              Nueva comanda — {DEPARTMENT_LABELS[dept] ?? dept}
            </h2>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowNewOrder(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm text-text-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={createOrder.isPending}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-60"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OrderCard({
  order,
  onItemAdvance,
  onAddItem,
  isAddingItem,
  newItemTitle,
  newItemServings,
  onNewItemTitleChange,
  onNewItemServingsChange,
  onConfirmAddItem,
  onCancelAddItem,
}: {
  order: KitchenOrder
  onItemAdvance: (id: string, current: KOItemStatus) => void
  onAddItem: () => void
  isAddingItem: boolean
  newItemTitle: string
  newItemServings: number
  onNewItemTitleChange: (v: string) => void
  onNewItemServingsChange: (v: number) => void
  onConfirmAddItem: () => void
  onCancelAddItem: () => void
}) {
  const allReady = order.items?.every((i) => i.status === 'ready' || i.status === 'skipped')

  return (
    <div className={cn(
      'rounded-xl border bg-surface overflow-hidden flex flex-col',
      allReady ? 'border-success/40' : 'border-border'
    )}>
      {/* Order header */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2',
        allReady ? 'bg-success/10' : 'bg-surface-alt'
      )}>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-text-primary">
            #{order.sequence_number}
          </span>
          {allReady && <CheckCircle className="h-4 w-4 text-success" />}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-medium', KO_STATUS_COLORS[order.status])}>
            {KO_STATUS_LABELS[order.status]}
          </span>
          <span className="text-xs text-text-muted">
            {new Date(order.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 divide-y divide-border">
        {!order.items || order.items.length === 0 ? (
          <div className="p-3 text-xs text-text-muted text-center">Sin ítems</div>
        ) : (
          order.items.map((item) => (
            <button
              key={item.id}
              onClick={() => onItemAdvance(item.id, item.status)}
              disabled={item.status === 'ready' || item.status === 'skipped'}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                item.status === 'ready' ? 'bg-success/5' : 'hover:bg-surface-alt',
                item.status === 'in_progress' && 'bg-warning/5'
              )}
            >
              <div className={cn(
                'h-2.5 w-2.5 rounded-full flex-shrink-0',
                item.status === 'pending' && 'bg-text-muted',
                item.status === 'in_progress' && 'bg-warning',
                item.status === 'ready' && 'bg-success',
                item.status === 'skipped' && 'bg-text-muted opacity-40',
              )} />
              <div className="flex-1 min-w-0">
                <span className={cn(
                  'text-sm',
                  item.status === 'ready' ? 'line-through text-text-muted' : 'text-text-primary'
                )}>
                  {item.title}
                </span>
                {item.servings > 1 && (
                  <span className="text-xs text-text-muted ml-1">×{item.servings}</span>
                )}
              </div>
              <span className={cn('text-xs flex-shrink-0', KO_ITEM_STATUS_COLORS[item.status])}>
                {KO_ITEM_STATUS_LABELS[item.status]}
              </span>
            </button>
          ))
        )}

        {/* Añadir ítem inline */}
        {isAddingItem ? (
          <div className="p-3 space-y-2">
            <input
              autoFocus
              type="text"
              placeholder="Nombre del plato..."
              value={newItemTitle}
              onChange={(e) => onNewItemTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirmAddItem()
                if (e.key === 'Escape') onCancelAddItem()
              }}
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={newItemServings}
                onChange={(e) => onNewItemServingsChange(parseInt(e.target.value) || 1)}
                className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-center focus:outline-none"
              />
              <span className="text-xs text-text-muted">raciones</span>
              <div className="flex gap-1 ml-auto">
                <button onClick={onCancelAddItem} className="text-xs text-text-muted hover:text-text-primary px-2 py-1">
                  Cancelar
                </button>
                <button
                  onClick={onConfirmAddItem}
                  disabled={!newItemTitle.trim()}
                  className="text-xs bg-accent text-white px-2 py-1 rounded-lg disabled:opacity-60"
                >
                  Añadir
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={onAddItem}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-accent hover:bg-surface-alt transition-colors"
          >
            <Plus className="h-3 w-3" />
            Añadir plato
          </button>
        )}
      </div>
    </div>
  )
}
