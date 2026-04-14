# ChefOS v2 — Diseño UX

> Reglas de oro (de v1): 3-4 toques máximo, voz/imagen como input, vistas por rol.

---

## 1. Perfiles de uso (4 perfiles, 13 roles)

Los 13 roles del PRD se agrupan en 4 perfiles de uso con pantallas y navegación diferenciadas:

### Perfil COCINA (head_chef, sous_chef, cook)
- **Dispositivo principal:** Tablet en cocina (manos ocupadas, brillo alto, posible guantes)
- **Home:** Panel de producción del día
- **Prioridad:** Qué hacer AHORA, qué está bloqueado, qué falta

### Perfil OFICINA (direction, admin, superadmin)
- **Dispositivo principal:** Desktop en despacho
- **Home:** Dashboard KPIs + alertas
- **Prioridad:** Food cost, eventos próximos, métricas, equipo

### Perfil COMPRAS (procurement, warehouse)
- **Dispositivo principal:** Desktop + tablet en almacén
- **Home:** Pedidos pendientes + alertas de stock
- **Prioridad:** Qué pedir, qué recibir, qué caduca

### Perfil COMERCIAL (commercial, operations, room, reception)
- **Dispositivo principal:** Desktop
- **Home:** Calendario de eventos
- **Prioridad:** Eventos, clientes, BEOs

---

## 2. Navegación adaptativa por perfil

### Estructura: sidebar colapsable + home por rol

La sidebar muestra SOLO las secciones relevantes al perfil del usuario:

```
PERFIL COCINA                PERFIL OFICINA              PERFIL COMPRAS             PERFIL COMERCIAL
─────────────                ─────────────               ──────────────             ────────────────
■ Hoy (home)                 ■ Dashboard (home)          ■ Pedidos (home)           ■ Eventos (home)
  Producción                   KPIs                        Pendientes                 Calendario
  Mis tareas                   Food cost                   Recepciones                Clientes
  Mise en place                Alertas                     Stock                      BEOs
■ Recetas                    ■ Eventos                   ■ Catálogo                 ■ Recetas (lectura)
  Catálogo                     Calendario                  Productos                ■ Reportes
  Fichas técnicas              Clientes                    Proveedores
■ Stock                      ■ Recetas                   ■ Alertas
  Inventario rápido            Catálogo                    Caducidad
  Mermas                       Escandallos                 Stock bajo
■ KDS (si cocina lo usa)     ■ Producción
                             ■ Compras
                             ■ Inventario
                             ■ Reportes
                             ■ Settings
                               Hotel
                               Equipo
                               Config
```

### Regla de navegación
- **Mobile/Tablet:** Bottom navigation (4-5 iconos max) + hamburger para resto
- **Desktop:** Sidebar izquierda colapsable (iconos + texto)
- **Cambio de hotel:** Siempre redirige a home del perfil

---

## 3. Home screens por perfil

### 3.1 COCINA — "Hoy" (tablet-first)

```
┌─────────────────────────────────────────────────────────┐
│  ChefOS   [Hotel Parador]   [🔔 3]   [👤 Chef Israel]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  HOY — Lunes 14 Abril                                   │
│  ════════════════════                                   │
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │ 🔴 2 BLOQUEADAS  │  │ ✅ 8/14 HECHAS   │             │
│  │ Ver ahora →      │  │ Ver progreso →   │             │
│  └──────────────────┘  └──────────────────┘             │
│                                                         │
│  PRÓXIMO SERVICIO: Banquete García (200 pax) — 14:00    │
│  ├── Partida caliente: 5 recetas (3 listas, 2 pend.)   │
│  ├── Partida fría: 3 recetas (todas listas)             │
│  └── Pastelería: 2 recetas (1 lista, 1 en curso)       │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ACCIONES RÁPIDAS                                │   │
│  │  [📸 Merma rápida]  [🎤 Nota de voz]  [✓ Tarea] │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ALERTAS (2)                                            │
│  ⚠️ Salmón caduca mañana — 3.2 kg en cámara 2          │
│  ⚠️ Falta cebolla para Banquete García — pedir urgente │
│                                                         │
└─────────────────────────────────────────────────────────┘
  [🏠 Hoy]  [📋 Tareas]  [📖 Recetas]  [📦 Stock]  [•••]
```

### 3.2 OFICINA — "Dashboard" (desktop-first)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ☰ ChefOS    [Hotel Parador ▾]                    [🔔 5]  [👤]     │
├────────┬────────────────────────────────────────────────────────────┤
│        │                                                            │
│ Dash   │  DASHBOARD — Semana 16                                     │
│ Eventos│  ═══════════════════                                       │
│ Recetas│                                                            │
│ Produc.│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│ Compras│  │FC 28.3%│ │Merma 4%│ │12 event│ │3 alert │              │
│ Invent.│  │▼ 1.2%  │ │▲ 0.5%  │ │próximos│ │activas │              │
│ Report.│  └────────┘ └────────┘ └────────┘ └────────┘              │
│ ──────│                                                            │
│ Config │  ┌──────────────────────┐ ┌──────────────────────────┐     │
│        │  │ Food Cost por servicio│ │ Eventos próximos         │     │
│        │  │ (gráfico barras 7d)  │ │ Lun: Banquete García 200p│     │
│        │  │                      │ │ Mar: Buffet desayuno     │     │
│        │  │ Desayuno: 24%        │ │ Mie: Corp. Inditex 150p │     │
│        │  │ Banquetes: 31%       │ │ Jue: Boda López 180p    │     │
│        │  │ Room Serv: 35%       │ │                          │     │
│        │  └──────────────────────┘ └──────────────────────────┘     │
│        │                                                            │
│        │  ALERTAS ACTIVAS                                           │
│        │  🔴 Varianza >5% en banquete del sábado                    │
│        │  🟡 3 productos bajo stock mínimo                          │
│        │  🟡 Pedido #234 retrasado (Proveedor MarGalicia)           │
│        │                                                            │
└────────┴────────────────────────────────────────────────────────────┘
```

### 3.3 COMPRAS — "Pedidos" (desktop + tablet almacén)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ☰ ChefOS    [Hotel Parador ▾]                    [🔔 2]  [👤]     │
├────────┬────────────────────────────────────────────────────────────┤
│        │                                                            │
│ Pedidos│  PEDIDOS — Hoy                                             │
│ Recep. │  ═════════════                                             │
│ Catálog│                                                            │
│ Proveed│  ┌────────┐ ┌────────┐ ┌────────┐                         │
│ Stock  │  │4 pend. │ │2 hoy   │ │1 retraso│                        │
│ Alertas│  │de envío│ │recibir │ │⚠️       │                        │
│        │  └────────┘ └────────┘ └────────┘                         │
│        │                                                            │
│        │  POR RECIBIR HOY                                           │
│        │  ┌──────────────────────────────────────────────────┐      │
│        │  │ MarGalicia — PO#234                              │      │
│        │  │ 12 productos · 345 EUR · Llega 10:00-12:00      │      │
│        │  │ [📸 Recibir con foto]          [Ver detalle →]  │      │
│        │  └──────────────────────────────────────────────────┘      │
│        │  ┌──────────────────────────────────────────────────┐      │
│        │  │ Pescadería Norte — PO#237                        │      │
│        │  │ 5 productos · 189 EUR · Llega 07:00-09:00       │      │
│        │  │ [📸 Recibir con foto]          [Ver detalle →]  │      │
│        │  └──────────────────────────────────────────────────┘      │
│        │                                                            │
│        │  NECESIDADES PENDIENTES (sin pedido)                       │
│        │  ⚠️ 3 productos del Banquete García sin proveedor asignado│
│        │                                                            │
└────────┴────────────────────────────────────────────────────────────┘
```

### 3.4 COMERCIAL — "Eventos" (desktop)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ☰ ChefOS    [Hotel Parador ▾]                    [🔔 1]  [👤]     │
├────────┬────────────────────────────────────────────────────────────┤
│        │                                                            │
│ Eventos│  EVENTOS — Abril 2026              [+ Nuevo evento]        │
│ Cliente│  ═══════════════════                                       │
│ BEOs   │                                                            │
│ Recetas│  [Día]  [Semana]  [■ Mes]                                  │
│ Report.│                                                            │
│        │  Lu 14 │ Ma 15 │ Mi 16 │ Ju 17 │ Vi 18 │ Sa 19 │ Do 20 │ │
│        │  ──────┼───────┼───────┼───────┼───────┼───────┼───────│ │
│        │  Banq. │       │ Corp. │ Boda  │       │ Banq. │       │ │
│        │  García│       │ Indit.│ López │       │ Fdez  │       │ │
│        │  200p  │       │ 150p  │ 180p  │       │ 120p  │       │ │
│        │  ✅    │       │ ⏳    │ 📝    │       │ 📝    │       │ │
│        │                                                            │
│        │  PRÓXIMOS (detalle)                                        │
│        │  ┌──────────────────────────────────────────────────┐      │
│        │  │ Banquete García — Lun 14 · 200 pax · Boda       │      │
│        │  │ Estado: ✅ Confirmado · Menú: 3 tiempos          │      │
│        │  │ Producción: 80% lista · Compras: completas       │      │
│        │  │ [Ver BEO]  [Ver producción]  [Editar]            │      │
│        │  └──────────────────────────────────────────────────┘      │
│        │                                                            │
└────────┴────────────────────────────────────────────────────────────┘
```

---

## 4. Flujos de 3-4 toques

### 4.1 Registrar merma (COCINA — tablet)

```
Toque 1: [📸 Merma rápida] en home
Toque 2: Foto del producto O escanear QR O buscar por voz
         → Sistema identifica producto + lote (FIFO)
Toque 3: Confirmar cantidad (teclado numérico grande) + motivo (pills: caducidad|sobreproducción|error|daño)
Toque 4: [Registrar] → Toast "Merma registrada" → vuelve a home
```

### 4.2 Marcar tarea completada (COCINA — tablet)

```
Toque 1: Tap en tarea desde "Mis tareas" o "Hoy"
Toque 2: [✓ Completada] (botón grande, verde)
         → Si tiene foto obligatoria: cámara se abre
Toque 3: (opcional) Foto del resultado
         → Toast "Tarea completada" → siguiente tarea
```

### 4.3 Recibir mercancía (COMPRAS — tablet almacén)

```
Toque 1: [📸 Recibir con foto] en el pedido del día
Toque 2: Foto del albarán → sistema extrae datos (futuro OCR, manual por ahora)
Toque 3: Confirmar cantidades (tabla con qty esperada vs recibida, editable)
         → Si hay diferencia: pills de motivo (falta|daño|sustitución)
Toque 4: [Confirmar recepción] → Stock actualizado → Toast "Recepción OK"
```

### 4.4 Crear evento rápido (COMERCIAL — desktop)

```
Toque 1: [+ Nuevo evento]
Toque 2: Formulario mínimo: nombre, fecha, pax, tipo servicio
         → [Guardar borrador] (draft automático)
Toque 3: Asignar menú (selector de menús existentes O "menú libre")
Toque 4: [Confirmar evento] → Genera producción + compras automáticamente
```

### 4.5 Consultar food cost de un evento (OFICINA — desktop)

```
Toque 1: Click en evento desde dashboard o calendario
Toque 2: Tab "Costes" visible directamente en detalle
         → Coste teórico vs real, desglose por receta, margen
         (0 toques adicionales: la info está ahí)
```

### 4.6 Aprobar pedido de compra (OFICINA — desktop/móvil)

```
Toque 1: Notificación "Pedido pendiente de aprobación" O lista de pedidos
Toque 2: Ver resumen (proveedor, productos, total, evento asociado)
Toque 3: [Aprobar] O [Rechazar + motivo]
         → Toast "Pedido aprobado, enviado al proveedor"
```

### 4.7 Ver mise en place del día (COCINA — tablet)

```
Toque 1: "Mise en place" desde home o sidebar
         → Lista de preparaciones por partida, agrupadas por prioridad
         → Cada item: producto, cantidad, receta origen, checkbox
Toque 2: Tap checkbox para marcar como preparado
         → Progreso visual actualizado en tiempo real
```

---

## 5. Input por voz e imagen

### Voz (Web Speech API)
- **Dónde:** Búsqueda de productos, notas en tareas, registro de merma, notas de recepción
- **Cómo:** Icono de micrófono al lado de cada campo de texto/búsqueda
- **Fallback:** Teclado siempre disponible
- **Implementación:** `SpeechRecognition` API del navegador (gratis, sin backend)
- **Idioma:** Español (es-ES), configurable por hotel

### Imagen/Cámara
- **Dónde:** Registro de merma (foto del producto), recepción de mercancía (foto del albarán), fotos de platos (recetas)
- **Cómo:** `<input type="file" accept="image/*" capture="environment">` en mobile/tablet, upload en desktop
- **Almacenamiento:** Supabase Storage, referencia en la tabla correspondiente

### QR/Barcode (Fase 2)
- **Dónde:** Identificación rápida de lotes en almacén
- **Cómo:** Cámara del dispositivo + librería de scanning
- **Flujo:** Escanear → ver lote → acción rápida (sacar stock, registrar merma, mover)

---

## 6. Estados de interacción (componentes base)

Cada pantalla implementa estos 5 estados con componentes reutilizables:

### Loading
- Skeleton screens (no spinners)
- Tabla: filas skeleton con animación shimmer
- Cards: placeholder con forma de la card
- Dashboard: KPI cards con pulso

### Empty (primera vez)
- Ilustración simple + texto + CTA principal
- Ejemplo: "No hay recetas todavía. [Crear primera receta] o [Importar desde Excel]"
- Ejemplo: "No hay eventos esta semana. [Crear evento]"

### Error
- Toast en esquina superior derecha (auto-dismiss 5s)
- Si es error de red: banner fijo "Sin conexión" con icono
- Si es error de permisos: "No tienes acceso a esta sección" + botón volver
- Si es error de validación: inline en el campo (rojo + texto)

### Success
- Toast verde (auto-dismiss 3s): "Receta guardada", "Pedido enviado"
- Transición automática: después de crear → ir al detalle

### Partial / In-progress
- Progress bar en operaciones largas (generación de producción, import Excel)
- Badge de estado en listas: "3/14 completadas", "Recibido parcial"

---

## 7. Responsive: 3 breakpoints

| Breakpoint | Dispositivo | Layout |
|-----------|-------------|--------|
| < 768px | Móvil | Bottom nav (4 iconos), cards full-width, acciones grandes (min 48px touch target) |
| 768-1024px | Tablet | Bottom nav o sidebar colapsada, cards en grid 2 col, tablas compactas |
| > 1024px | Desktop | Sidebar expandida, tablas densas, paneles laterales |

### Tablet en cocina (reglas especiales)
- Touch targets mínimo 48x48px (dedos grandes, posibles guantes)
- Contraste alto (brillo de cocina)
- No hover states (solo tap)
- Tipografía mínima 16px
- Botones de acción con icono + texto (no solo icono)

---

## 8. Onboarding (setup wizard — 3 pasos)

Cuando un admin crea cuenta por primera vez:

```
PASO 1: Tu hotel                          PASO 2: Tu catálogo               PASO 3: Primer evento
─────────────────                         ──────────────────                ─────────────────────
Nombre del hotel: [________]              [Importar Excel]                 Nombre: [________]
Timezone: [Europa/Madrid ▾]               O                                Fecha: [________]
Moneda: [EUR ▾]                           [Empezar con catálogo base]      Pax: [________]
                                          (12 categorías, productos       Tipo: [Banquete ▾]
                                           de ejemplo)
                                                                          [Crear borrador]
[Siguiente →]                             [Siguiente →]                   [Ir al dashboard →]
```

Después del wizard:
- Dashboard muestra los datos del primer evento (no está vacío)
- Sidebar muestra módulos relevantes al rol
- Tooltip de "siguiente paso sugerido" (crear primera receta, añadir proveedor)

---

## 9. Paleta de colores y modo

### Dark mode por defecto (cocina = brillo alto, dark reduce fatiga)

| Uso | Color | Token |
|-----|-------|-------|
| Fondo principal | #0a0a0f | `--bg-primary` |
| Fondo cards | #141420 | `--bg-card` |
| Fondo sidebar | #0d0d15 | `--bg-sidebar` |
| Texto principal | #e8e8ed | `--text-primary` |
| Texto secundario | #8888a0 | `--text-secondary` |
| Acento principal | #6366f1 | `--accent` (indigo) |
| Success | #22c55e | `--success` |
| Warning | #f59e0b | `--warning` |
| Danger | #ef4444 | `--danger` |
| Info | #3b82f6 | `--info` |

### Accesibilidad
- Colores de estado SIEMPRE con icono + texto (no solo color)
- Contraste mínimo 4.5:1 (WCAG AA)
- Estados: 🔴 Bloqueado/Urgente, 🟡 Atención, 🟢 OK/Completado, ⚪ Pendiente
- Focus visible en todos los elementos interactivos (outline 2px)
