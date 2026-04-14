
# Routes — ChefOS v2 (Next.js App Router)

All routes under `src/app/`. Dashboard routes require auth + hotel membership (AppShell).

## Auth (`src/app/(auth)/`)
- `/login`
- `/signup`
- `/forgot-password`
- `/onboarding` — hotel setup after first sign-in

## Dashboard (`src/app/(dashboard)/`)

### Dashboard
- `/dashboard` — KPIs live: eventos, producción, compras, inventario, alertas

### Eventos (M1)
- `/events` — listado calendario
- `/events/new`
- `/events/[id]` — detalle + BEO + reservas de stock + generar workflow

### Recetas y menús (M2)
- `/recipes` — catálogo de recetas
- `/recipes/new`
- `/recipes/[id]` — detalle, ingredientes, pasos, state machine
- `/recipes/[id]/escandallo` — escandallo live vs albarán, sync precios
- `/escandallos` — simulador sin receta previa
- `/menus` — catálogo de menús (secciones + recetas)

### Catálogo (M3)
- `/catalog` — lista de productos
- `/catalog/products/[id]`
- `/catalog/suppliers` — lista de proveedores
- `/catalog/suppliers/[id]` — 5 tabs: Info / Ofertas / Config / Incidencias / Métricas

### Compras (M4)
- `/procurement` — solicitudes (PR) y órdenes (PO)
- `/procurement/requests/new`
- `/procurement/requests/[id]`
- `/procurement/orders/[id]`

### Inventario (M5)
- `/inventory` — stock levels por producto
- `/inventory/movements` — historial de movimientos
- `/inventory/waste` — registro de mermas
- `/inventory/counts` — sesiones de conteo (full/partial/blind)
- `/inventory/counts/[id]` — líneas de conteo, aplicar ajustes
- `/inventory/forensics` — análisis forense de pérdidas por producto

### Producción (M6)
- `/production` — planes de producción diarios
- `/production/[id]` — detalle de plan
- `/production/workflows/[id]` — workflow de evento con tareas por departamento + MeP
- `/production/mise-en-place` — checklists MeP por workflow/departamento
- `/production/kds/[station]` — KDS por partida (polling 10s)
- `/production/kanban` — tablero kanban de tareas por workflow
- `/production/shopping-list` — lista de compra por fecha (ingredientes − stock)

### Reportes / Ajustes
- `/reports` — placeholder (Etapa 1.5)
- `/settings` — configuración del hotel
- `/settings/team` — gestión de equipo y roles
