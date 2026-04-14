import {
  CalendarDays,
  Calculator,
  ChefHat,
  ClipboardCheck,
  ClipboardList,
  Columns,
  LayoutDashboard,
  ListChecks,
  Monitor,
  Package,
  Settings,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  UtensilsCrossed,
  Warehouse,
  AlertTriangle,
  Activity,
  type LucideIcon,
} from 'lucide-react'
import type { UXProfile } from '@/features/identity/types'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

export interface NavGroup {
  title?: string
  items: NavItem[]
}

/** Navegación adaptativa por perfil UX (de UX_DESIGN.md) */
export const NAV_BY_PROFILE: Record<UXProfile, NavGroup[]> = {
  cocina: [
    {
      items: [
        { label: 'Hoy', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Producción', href: '/production', icon: ClipboardList },
      ],
    },
    {
      title: 'Recetas',
      items: [
        { label: 'Catálogo', href: '/recipes', icon: ChefHat },
        { label: 'Escandallos', href: '/escandallos', icon: Calculator },
        { label: 'Menús', href: '/menus', icon: UtensilsCrossed },
      ],
    },
    {
      title: 'Cocina operativa',
      items: [
        { label: 'Mise en place', href: '/production/mise-en-place', icon: ListChecks },
        { label: 'KDS', href: '/production/kds/cocina_caliente', icon: Monitor },
        { label: 'Kanban', href: '/production/kanban', icon: Columns },
        { label: 'Lista compras', href: '/production/shopping-list', icon: ShoppingCart },
      ],
    },
    {
      title: 'Stock',
      items: [
        { label: 'Inventario', href: '/inventory', icon: Package },
        { label: 'Conteos', href: '/inventory/counts', icon: ClipboardCheck },
        { label: 'Forensics', href: '/inventory/forensics', icon: Activity },
      ],
    },
  ],
  oficina: [
    {
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Eventos', href: '/events', icon: CalendarDays },
      ],
    },
    {
      title: 'Operaciones',
      items: [
        { label: 'Recetas', href: '/recipes', icon: ChefHat },
        { label: 'Escandallos', href: '/escandallos', icon: Calculator },
        { label: 'Menús', href: '/menus', icon: UtensilsCrossed },
        { label: 'Producción', href: '/production', icon: ClipboardList },
        { label: 'Mise en place', href: '/production/mise-en-place', icon: ListChecks },
        { label: 'Kanban', href: '/production/kanban', icon: Columns },
        { label: 'Lista compras', href: '/production/shopping-list', icon: ShoppingCart },
        { label: 'Compras', href: '/procurement', icon: ShoppingCart },
        { label: 'Inventario', href: '/inventory', icon: Package },
        { label: 'Conteos', href: '/inventory/counts', icon: ClipboardCheck },
        { label: 'Forensics', href: '/inventory/forensics', icon: Activity },
      ],
    },
    {
      title: 'Catálogo',
      items: [
        { label: 'Productos', href: '/catalog', icon: Package },
        { label: 'Proveedores', href: '/catalog/suppliers', icon: Warehouse },
      ],
    },
    {
      title: 'Análisis',
      items: [
        { label: 'Reportes', href: '/reports', icon: TrendingUp },
      ],
    },
    {
      title: 'Admin',
      items: [
        { label: 'Equipo', href: '/settings/team', icon: Users },
        { label: 'Config', href: '/settings', icon: Settings },
      ],
    },
  ],
  compras: [
    {
      items: [
        { label: 'Pedidos', href: '/dashboard', icon: ShoppingCart },
        { label: 'Recepciones', href: '/procurement/receipts', icon: Truck },
      ],
    },
    {
      title: 'Catálogo',
      items: [
        { label: 'Productos', href: '/catalog', icon: Package },
        { label: 'Proveedores', href: '/catalog/suppliers', icon: Warehouse },
      ],
    },
    {
      title: 'Alertas',
      items: [
        { label: 'Alertas', href: '/alerts', icon: AlertTriangle },
      ],
    },
  ],
  comercial: [
    {
      items: [
        { label: 'Eventos', href: '/dashboard', icon: CalendarDays },
        { label: 'Clientes', href: '/events/clients', icon: Users },
      ],
    },
    {
      title: 'Recursos',
      items: [
        { label: 'Recetas', href: '/recipes', icon: ChefHat },
        { label: 'Reportes', href: '/reports', icon: TrendingUp },
      ],
    },
  ],
}
