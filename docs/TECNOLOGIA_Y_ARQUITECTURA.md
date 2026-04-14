# Tecnología y Arquitectura (ChefOS)

> Objetivo: una **única aplicación** que funcione en **PC + tablet + móvil** con la **mínima intervención** de infraestructura y mantenimiento, priorizando rapidez operativa en cocina/almacén y trazabilidad.

---

## 1) Decisiones clave

### 1.1 Un solo producto para todos los dispositivos
- **Web Responsive (tablet-first)** como base.
- **PWA (Progressive Web App)** para instalación en tablets/móviles (icono, pantalla completa, mejor UX).
- Evitamos 3 apps (iOS/Android/Web) y reducimos coste/tiempo.

### 1.2 Backend gestionado
- **Supabase** como backend (Postgres + Auth + Storage + Edge Functions) para reducir DevOps.
- **Vercel** como hosting del frontend (Next.js) con despliegues automáticos.

### 1.3 Arquitectura limpia y modular
- **Clean Architecture + Hexagonal (pragmática)**:
  - Dominio y casos de uso desacoplados de la infraestructura.
  - Adaptadores para Supabase, impresión PDF, escaneo, etc.
- **Eventos internos (domain events)** para desacoplar módulos y habilitar automatizaciones/alertas sin “spaghetti”.

---

## 2) Stack tecnológico recomendado

### Frontend (Vercel)
- **Next.js (App Router) + React + TypeScript**
- **Tailwind CSS + shadcn/ui** (UI rápida, consistente, escalable)
- **TanStack Query (React Query)** para cache/estado servidor
- **Zod** para validación en cliente y contratos (DTOs)
- **PWA**: `next-pwa` (service worker) + **IndexedDB** (offline ligero)
- **Formularios**: React Hook Form + Zod
- **Tablas/UX densa**: TanStack Table

### Backend (Supabase)
- **Postgres** como fuente de verdad
- **Supabase Auth** (roles/permiso por usuario)
- **RLS (Row Level Security)** para seguridad multi-tenant (por `hotel_id`) y por rol
- **Supabase Storage** para imágenes (albaranes), etiquetas, adjuntos
- **Edge Functions** para:
  - generación de PDFs
  - lógica que NO debe vivir en el cliente
  - jobs ligeros (según necesidades)

### Integraciones (fase 2 / opcionales)
- **Impresión de etiquetas** (códigos de barras/QR): módulo preparado, integración por adaptar
- **APIs externas** (si aplica): calendario de ferias/eventos, meteorología, etc.

---

## 3) Arquitectura de referencia

### 3.1 Capas (Clean + Hexagonal)

1) **Domain (núcleo)**
- Entidades: Producto, Proveedor, Evento, Pedido, MovimientoInventario, Preparación, Merma…
- Value Objects: Money, Quantity, Unit, DateRange, LeadTime…
- Reglas: estados permitidos, coherencia de stock, límites/cut-off de pedidos.

2) **Application (casos de uso)**
- Orquesta flujos: `CreatePurchaseOrder`, `ReceiveDelivery`, `GenerateProductionPlan`, `RegisterWaste`, etc.
- Publica eventos internos: `purchase_order.created`, `inventory.movement.recorded`, `event.updated`.

3) **Adapters (infraestructura)**
- Repositorios Postgres/Supabase
- Storage (imágenes)
- PDF generator
- Barcode scanner adapter
- Notificaciones

4) **UI (Next.js)**
- Pantallas y componentes
- Llamadas a casos de uso (vía API layer)

> Regla: **UI nunca habla directo con la DB** saltándose casos de uso.

### 3.2 Contratos y eventos
- Definir **DTOs estables** para:
  - requests/responses
  - eventos internos
- Versionado básico: `v1`, `v2` si hay cambios relevantes.

### 3.3 Event-driven “ligero”
- No hace falta Kafka.
- Opciones:
  - **Tabla `event_outbox`** (Outbox Pattern) + Edge Function que procese eventos.
  - Triggers Postgres (con cuidado) solo para invariantes simples.

---

## 4) Organización del repositorio (Turborepo)

Estructura recomendada:

```
project/
  apps/
    web/                 # Next.js (PC/Tablet/Móvil)
  packages/
    ui/                  # Design system (shadcn/ui wrappers)
    domain/              # Entidades + reglas (puro TS)
    application/         # Casos de uso + puertos
    infrastructure/      # Adaptadores (Supabase/PDF/Scanner/etc)
    contracts/           # DTOs + eventos internos
    config/              # eslint/tsconfig/tailwind shared
  supabase/
    migrations/
    seed/
    policies/
  docs/
    arquitectura/
    modulos/
    testing/
  scripts/
```

### Convención
- `domain` no importa nada de infraestructura.
- `application` depende de `domain`.
- `infrastructure` implementa puertos de `application`.
- `web` consume `application` + `ui`.

---

## 5) Modelo de datos (alto nivel)

### Multi-tenant
- Todas las tablas con `hotel_id`.
- RLS:
  - `hotel_id = auth.jwt() -> hotel_id`
  - reglas por rol: admin, compras, cocina, almacén, lectura.

### Auditoría y trazabilidad
- `created_by`, `created_at`, `updated_at`
- tablas de movimientos:
  - `inventory_movements` (entrada/salida/ajuste/merma)
  - `production_batches` / `preparations` (lotes)
  - `purchase_order_receipts` (recepciones parciales)

### Estados
- pedidos: `draft -> approved -> sent -> received_partial -> received_complete -> closed`

---

## 6) Seguridad (imprescindible)

### RLS como primera línea
- Ninguna lectura/escritura sin política.

### Roles y permisos
- RBAC simple:
  - **Admin**: todo
  - **Compras**: proveedores + pedidos + recepciones
  - **Cocina**: producción + mermas
  - **Almacén**: inventario + recepciones
  - **Lectura**: dashboard

### Validación doble
- Cliente: Zod
- Servidor: Edge Functions / DB constraints (CHECK/FOREIGN KEYS)

---

## 7) Offline y cocina (móvil/tablet)

### Principio
- Offline **solo para flujos críticos cortos**:
  - registrar merma
  - registrar salida de stock
  - escanear y registrar movimiento

### Estrategia
- Guardar eventos “pendientes” en IndexedDB.
- Sincronizar cuando vuelva conexión.
- Resolver conflictos con regla: **servidor manda**, cliente reintenta y muestra estado.

---

## 8) Escaneo y etiquetado

### Móvil
- Web camera + librería de escaneo (adapter)
- Al escanear:
  - buscar etiqueta/lote
  - mostrar ficha rápida
  - registrar movimiento

### Impresión (fase posterior)
- Diseñar interfaz `LabelPrinterPort`.
- Implementaciones:
  - PDF/PNG descargable
  - integración con impresora (por definir)

---

## 9) PDFs y documentos

- Generación de PDF en **Edge Function**:
  - pedidos por proveedor
  - resumen por evento
- Guardado en Storage + referencia en DB.

---

## 10) Observabilidad y calidad

### Logs
- Edge Functions: logging estructurado
- Frontend: captura de errores (Sentry opcional)

### Métricas
- tiempos de carga
- errores por endpoint
- flujos de usuario críticos

---

## 11) Testing (objetivo ≥ 90% en lógica)

### Qué testear fuerte
- `domain` + `application` (reglas y casos de uso)

### Herramientas
- **Vitest** para unit tests
- **Playwright** para E2E (flujos críticos)
- **MSW** para mocks en frontend

### Estrategia
- Unit: invariantes, cálculos, transiciones de estado
- Integration: repositorios Supabase (con DB de test)
- E2E: login -> crear evento -> generar producción -> crear pedido -> recibir parcial -> ver stock

---

## 12) Roadmap técnico (muy resumido)

1) **Base**: auth + RLS + UI shell + módulos core
2) **MVP operativo**: Eventos → Producción → Compras → Inventario → Alertas
3) **Trazabilidad avanzada**: etiquetado/lotes + mermas + auditoría
4) **Automatizaciones**: sugerencias de pedido, reglas predictivas
5) **Offline crítico + impresora**

---

## 13) No-go (lo que evitamos al inicio)

- Microservicios
- Mensajería pesada (Kafka/Rabbit) antes de necesitarla
- App nativa (solo si el PWA se queda corto)
- ML/IA en el core antes de tener datos consistentes

---

## 14) Checklist de aceptación (arquitectura)

- [ ] Monorepo Turborepo con `apps/` y `packages/`
- [ ] Domain puro sin dependencias de infra
- [ ] Application con puertos (interfaces)
- [ ] Infra implementa puertos (Supabase/Storage/PDF)
- [ ] RLS activo en todas las tablas
- [ ] DTOs y eventos en `packages/contracts`
- [ ] Tests unitarios dominan el coverage
- [ ] PWA instalable y responsive (tablet-first)

