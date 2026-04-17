import {
  Bot,
  CalendarDays,
  Calculator,
  ChefHat,
  ClipboardCheck,
  ClipboardList,
  Columns,
  FileText,
  LayoutDashboard,
  ListChecks,
  Monitor,
  Package,
  Settings,
  ShoppingCart,
  Tag,
  Thermometer,
  TrendingUp,
  Truck,
  Users,
  UtensilsCrossed,
  Warehouse,
  AlertTriangle,
  Activity,
  Zap,
  Plug,
  UserCog,
  CalendarRange,
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
        { label: 'Eventos', href: '/events', icon: CalendarDays },
        { label: 'Producción', href: '/production', icon: ClipboardList },
      ],
    },
    {
      title: 'Recetas',
      items: [
        { label: 'Recetas', href: '/recipes', icon: ChefHat },
        { label: 'Escandallos', href: '/escandallos', icon: Calculator },
        { label: 'Menús', href: '/menus', icon: UtensilsCrossed },
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
      title: 'Cocina operativa',
      items: [
        { label: 'Mise en place', href: '/production/mise-en-place', icon: ListChecks },
        { label: 'KDS', href: '/production/kds/cocina_caliente', icon: Monitor },
        { label: 'Kanban', href: '/production/kanban', icon: Columns },
        { label: 'Lista compras', href: '/production/shopping-list', icon: ShoppingCart },
        { label: 'Compras', href: '/procurement', icon: ShoppingCart },
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
    {
      title: 'Compliance',
      items: [
        { label: 'APPCC', href: '/compliance/appcc', icon: ClipboardCheck },
        { label: 'Temperaturas', href: '/compliance/temperatures', icon: Thermometer },
        { label: 'Etiquetado', href: '/compliance/labels', icon: Tag },
      ],
    },
    {
      title: 'Documentos',
      items: [
        { label: 'Documentos PDF', href: '/documents', icon: FileText },
      ],
    },
    {
      title: 'Personal',
      items: [
        { label: 'Mi horario', href: '/hr/schedule', icon: CalendarRange },
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
      title: 'Compliance',
      items: [
        { label: 'APPCC', href: '/compliance/appcc', icon: ClipboardCheck },
        { label: 'Temperaturas', href: '/compliance/temperatures', icon: Thermometer },
        { label: 'Etiquetado', href: '/compliance/labels', icon: Tag },
        { label: 'Trazabilidad', href: '/compliance/trace/search', icon: Activity },
      ],
    },
    {
      title: 'Análisis',
      items: [
        { label: 'Reportes', href: '/reports', icon: TrendingUp },
        { label: 'Alertas', href: '/alerts', icon: AlertTriangle },
        { label: 'Documentos', href: '/documents', icon: FileText },
      ],
    },
    {
      title: 'Personal',
      items: [
        { label: 'Empleados',  href: '/hr/personnel', icon: UserCog },
        { label: 'Horarios',   href: '/hr/schedule',  icon: CalendarRange },
      ],
    },
    {
      title: 'Agentes',
      items: [
        { label: 'Sugerencias',     href: '/agents',                  icon: Bot },
        { label: 'Config agentes',  href: '/agents/config',           icon: Zap },
      ],
    },
    {
      title: 'Admin',
      items: [
        { label: 'Automatización',  href: '/automation',              icon: Zap },
        { label: 'Integraciones',   href: '/settings/integrations',   icon: Plug },
        { label: 'Equipo',          href: '/settings/team',           icon: Users },
        { label: 'Config',          href: '/settings',                icon: Settings },
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
