# Design System — ChefOS v2

> Industrial Control Surface for professional kitchens. Software de operaciones de cocina para hoteles, catering y eventos.

---

## Product Context

- **Qué es:** Dashboard operativo multi-servicio para hoteles y catering. Cubre recetas, compras, inventario, producción (KDS), compliance (APPCC), RRHH y notificaciones.
- **Usuarios:** Jefes de cocina y kitchen managers en turnos de hasta 16 horas, a menudo con alta luminosidad ambiental y pantallas cerca de zonas de preparación.
- **Espacio:** B2B SaaS de operaciones alimentarias. Competidores: Apicbase, MarketMan, ChefTec, Toast, TouchBistro.
- **Tipo de proyecto:** Web app / dashboard profesional. Multi-tenant.

---

## Aesthetic Direction

- **Dirección:** Industrial Control Surface
- **Nivel de decoración:** Minimal — la tipografía y el espaciado hacen todo el trabajo. Sin ilustraciones, sin gradientes, sin glassmorphism.
- **Mood:** Un cuadro de mandos de turno de cocina, no un SaaS de restaurante. Más cercano a un flight deck o una consola de despacho que a una app de hospitalidad. Matte, preciso, disciplinado.
- **Diferenciación clave:** Todos los competidores usan light mode con paletas frías (verde/teal/azul). ChefOS es dark-first — diferenciación funcional real, no solo estética: las cocinas trabajan 24h bajo luz artificial intensa y el dark mode reduce la fatiga visual en turnos de madrugada.

---

## Typography

### Stack completo

| Rol | Fuente | Peso | Uso |
|-----|--------|------|-----|
| Display / Módulos | **Syne** | 600–700 | Títulos de página, nombres de módulo, hero headings |
| Body / UI | **DM Sans** | 400–500 | Párrafos, formularios, labels, navegación, botones |
| Datos / Números | **DM Mono** | 400–500 | KPIs, cantidades de stock, precios, porcentajes, timestamps |
| Códigos / Status | **JetBrains Mono** | 400–500 | Lote IDs, referencias de proveedor, APPCC IDs, badges de estado |

### Carga de fuentes (Google Fonts)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

### Escala tipográfica

| Nivel | Fuente | Tamaño | Peso | Uso |
|-------|--------|--------|------|-----|
| Display | Syne | 36–48px | 700 | Hero del módulo, primera pantalla |
| H1 / Página | Syne | 28px | 700 | Título de página |
| H2 / Sección | Syne | 22px | 600 | Cabecera de sección, nombre de evento |
| H3 / Card | Syne | 17px | 600 | Título de card |
| Body | DM Sans | **17.6px** (110% de 16px) | 400 | Texto base — Israel pidió 110% |
| Body SM | DM Sans | 14px | 400 | Captions, metadata |
| Label | DM Sans | 13px | 500 | Form labels, column headers |
| KPI | DM Mono | 28–40px | 500 | Números dominantes en widgets |
| Data | DM Mono | 13–15px | 400 | Valores de tabla, precios, cantidades |
| Code | JetBrains Mono | 11–13px | 400–500 | IDs, badges, audit trails |

### Reglas de uso

- Los números son siempre el héroe: `28px` mínimo para KPIs. La etiqueta va debajo, en `11px`, `text-muted`.
- Uppercase solo en metadata diminuta (`letter-spacing: 0.08em`), nunca en navegación completa.
- `DM Mono` activa `font-variant-numeric: tabular-nums` en todas las tablas.
- Las columnas de números en tablas van siempre a la derecha (`text-align: right`).

---

## Color

### Approach: Restrained — el color es estado, no decoración.

```css
:root {
  /* Superficies */
  --bg:           #1a1a1a;   /* fondo base de página */
  --surface:      #242424;   /* cards, panels, dropdowns */
  --surface-2:    #1e1e1e;   /* sidebar, command band, nested surfaces */
  --surface-3:    #2a2a2a;   /* hover states, selected rows */
  --border:       #2e2e2e;   /* bordes por defecto */
  --border-strong:#3a3a3a;   /* separadores thead, secciones importantes */

  /* Texto — todos pasan WCAG 2.1 AA 4.5:1 sobre bg-card (#242424) */
  --text-primary:   #d4d4d4; /* 9.9:1 — texto principal */
  --text-secondary: #a0a0a0; /* 5.8:1 — metadata, subtítulos */
  --text-muted:     #949494; /* 4.8:1 — labels, placeholders, hints (subido de #6a6a6a en sesión 16 por WCAG) */

  /* Accent — EXCLUSIVO para CTA primario y estado activo. Nada más. */
  --accent:       #e8e4dc;   /* Tungsten White — warm off-white */
  --accent-fg:    #1a1a1a;   /* texto sobre botón primario */

  /* Estado funcional */
  --urgent:       #c0392b;   /* acción requerida ahora: stock bajo, temperatura crítica */
  --urgent-bg:    rgba(192, 57, 43, 0.12);
  --urgent-border:rgba(192, 57, 43, 0.25);

  --warning:      #b87333;   /* cobre — riesgo creciente: atención, tendencia negativa */
  --warning-bg:   rgba(184, 115, 51, 0.12);
  --warning-border:rgba(184, 115, 51, 0.25);

  --success:      #5a7a5a;   /* confirmación silenciosa: recibido, aprobado */
  --success-bg:   rgba(90, 122, 90, 0.12);
  --success-border:rgba(90, 122, 90, 0.25);

  --info:         #4a6070;   /* mensajes de sistema, sugerencias de agente */
  --info-bg:      rgba(74, 96, 112, 0.12);
  --info-border:  rgba(74, 96, 112, 0.25);

  /* Foregrounds de estado — sesión 16. Los tokens *-base de arriba son para
     bg-/border- (tintes saturados); éstos son foregrounds claros que pasan
     WCAG AA 4.5:1 sobre bg-card. `.text-success/warning/danger/info`
     override las clases Tailwind auto-generadas para usar estos. */
  --success-fg: #8baf8b; /* 5.5:1 */
  --warning-fg: #d4a574; /* 5.7:1 */
  --danger-fg:  #e88070; /* 5.2:1 */
  --info-fg:    #8ba6b8; /* 5.3:1 */

  /* Focus ring */
  --focus-ring:   #e8e4dc;   /* igual que accent — 12.9:1 contraste */
}
```

### Paleta de data viz (5 colores, todos desaturados)

Para gráficos de barras, líneas y donuts. Coexisten en dark sin que ninguno grite sobre los demás.

```css
--chart-food-cost:   #6b8fa3;  /* slate — food cost */
--chart-stock:       #8fa36b;  /* sage — niveles de stock */
--chart-spend:       #a38b6b;  /* sand — gasto de compras */
--chart-waste:       #8b6ba3;  /* dusty violet — mermas */
--chart-alerts:      #a36b6b;  /* terracotta — tendencia de alertas */
```

### Reglas de color

- `--accent` nunca se usa en texto secundario, decoración, ni bordes genéricos. Solo: botón primario + nav item activo + focus ring.
- El warning es **cobre** (`#b87333`), no amarillo/amber — funciona mejor en tamaños pequeños y no se confunde con `--accent`.
- El success está deliberadamente desaturado — no es una celebración, es una confirmación silenciosa.
- Sin botones de color por defecto: las acciones primarias se leen por contraste, escala y posición, no por color de fondo llamativo.
- Las sombras son casi inexistentes: la separación viene del tono y el borde, no del blur.
- **Separación FG vs base de estado** (sesión 16, WCAG): los tokens base `--{success|warning|danger|info}` son SATURADOS y solo pasan contraste en fondos grandes — usarlos para `bg-*/10`, `border-*`. Para texto usar los `*-fg` (claros, WCAG AA). `.text-success`, `.text-warning`, `.text-danger`, `.text-info` ya apuntan a los FG globalmente.

### alert-box vs status-rail

Dos patrones distintos con criterio claro:
- **`.alert-box`** — bg entera tintada del estado + border-left 3px saturado + `.alert-title` en FG claro. Para **mensajes que requieren atención**: alertas, sugerencias de agente, feed operativo, banners de acción. "De un vistazo sin leer".
- **`.status-rail`** — solo border-left 3px, sin bg tintado. Para **estado de trabajo o contexto**: banda de mando del dashboard (Turno/Servicio/Siguiente acción), integraciones, KPI cards summary.
- **Rows `<tr>` de tabla** — usan `status-rail` pero tintan automáticamente vía CSS global cuando variant=urgent/warning. Success/info NO tintan (menos ruido visual cuando el estado es neutro/positivo).

---

## Spacing

- **Unidad base:** 4px
- **Densidad:** Compacta por defecto. Los estados normales son silenciosos. Las excepciones ganan altura, borde y color.

| Token | Valor | Uso |
|-------|-------|-----|
| `space-1` | 4px | gaps internos mínimos |
| `space-2` | 8px | padding de badge, gap de icono |
| `space-3` | 12px | padding de tabla (compact) |
| `space-4` | 16px | padding de card, gap de form group |
| `space-5` | 20px | padding de sección interior |
| `space-6` | 24px | padding de layout principal |
| `space-8` | 32px | separación entre secciones |
| `space-12` | 48px | separación entre bloques grandes |
| `space-16` | 64px | margen de página |

---

## Layout

- **Approach:** Grid asimétrico — composición primero, componentes después.
- **Sidebar:** Estrecho, icon-led, siempre visible. Sin texto en nav salvo tooltip en hover. Ancho: 56px colapsado / 200px expandido (opcional).
- **Main content max-width:** 1280px.
- **Grid principal:** `8/4` o `9/3` (nunca columnas iguales para datos operativos).
- **Border radius:** `4px` en tablas y inputs compactos | `8px` en cards y botones | `10px` en modales y panels grandes.

### Composición del Dashboard (RISK confirmado)

El dashboard NO comienza con un mosaico de KPI cards. Estructura:

```
┌─────────────────────────────────────────────────────────┐
│  BANDA DE MANDO (command band) — top 35%                 │
│  Turno activo · Servicio del día · Bloqueadores · Acción │
├─────────────────────────┬───────────────────────────────┤
│  KPIs operativos (8/12) │  Alertas + aprobaciones (4/12)│
├─────────────────────────┴───────────────────────────────┤
│  Tabla / lista / kanban de prioridad                     │
└─────────────────────────────────────────────────────────┘
```

**Reglas de composición:**
- Banda horizontal primero, cards después.
- Preferir tablas largas, timelines, kanban rails y colas de prep sobre stacked mini-cards.
- Las cards son contenedores, no decoración.
- El espaciado separa sistemas de responsabilidad, no hace la UI "aireada".
- Cada pantalla necesita un "anchor panel" que se lea desde 3 metros.

---

## Left-Border Status System (RISK confirmado)

El sistema de estado de ChefOS usa un rail de 3px en el borde izquierdo como ÚNICA señal visual de estado. Sin badges flotantes, sin columnas de estado adicionales, sin cambios de fondo completo.

```css
/* Implementación base */
.status-item {
  border-left: 3px solid var(--border); /* invisible = sin estado especial */
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}
.status-item.urgent  { border-left-color: var(--urgent); }
.status-item.warning { border-left-color: var(--warning); }
.status-item.success { border-left-color: var(--success); }
.status-item.info    { border-left-color: var(--info); }
```

**Por qué funciona:** Un jefe de cocina leyendo desde el otro lado del pase lee el estado de toda la operación en una pasada horizontal. El borde izquierdo de la pantalla se convierte en una tira de estado continua. Escala a mobile (el borde se convierte en borde superior, misma anchura).

**En tablas:** `border-left` en el `<tr>`, no en el `<td>`.

**Badges de texto** (JetBrains Mono, 11px, uppercase): se usan en adición al rail, nunca como sustituto. El rail es la señal rápida; el badge es la etiqueta de texto para screen readers y detalle.

---

## Motion

- **Approach:** Minimal-functional. Solo transiciones que ayudan a comprender el estado. Sin entrance animations decorativas.
- **Easing:** enter → `ease-out` | exit → `ease-in` | move → `ease-in-out`
- **Duraciones:**
  - `micro`: 60ms — cambios de color, focus rings
  - `short`: 150ms — hover states, toggles
  - `medium`: 250ms — paneles que abren, modales
  - `long`: 400ms — transiciones de página (evitar si posible)

---

## Photography (opcional)

Las fotografías son soportadas pero no requeridas. El sistema funciona perfectamente sin ellas.

**Módulos donde aplica:**
- Recetas: foto del plato (thumbnail 48px en lista, max 300px en ficha)
- Catálogo/Productos: foto del ingrediente o producto
- Eventos/BEO: foto del setup del salón

**Módulos sin foto:**
- Compras, Inventario, Compliance APPCC, RRHH, KDS — operativo puro.

**Tratamiento:**
- Contenedor `#242424` sin overlay ni sombra dramática
- Placeholder con icono Lucide cuando no hay foto
- `object-fit: cover` siempre
- Sin efectos hover de zoom — la foto es información, no decoración

---

## Component Patterns

### Botones

```
Primario:    bg #e8e4dc, text #1a1a1a, border #e8e4dc
Secundario:  bg transparent, text #d4d4d4, border #3a3a3a
Ghost:       bg transparent, text #a0a0a0, border transparent
Destructivo: bg urgent-bg, text #e88070, border urgent-border
```

- Padding: `8px 16px` (md) | `6px 12px` (sm) | `10px 20px` (lg)
- Sin botones de color llamativo como CTA por defecto.

### Badges de estado

```
font-family: JetBrains Mono
font-size: 11px
font-weight: 500
letter-spacing: 0.06em
text-transform: uppercase
padding: 2px 8px
border-radius: 4px
```

Siempre complementan el left-border system, nunca lo sustituyen.

### Formularios

- Input bg: `--surface-2` (más oscuro que la card que lo contiene)
- Border normal: `--border`
- Border focus: `--accent` (ring visible, `outline: 2px solid var(--accent)`)
- Label: `13px`, `font-weight: 500`, `--text-secondary`
- Error: borde `--urgent` + texto de error en `--urgent` debajo

### Tablas

- Thead: `--surface-2` bg, `--border-strong` bottom border
- Th: JetBrains Mono, 10px, uppercase, `letter-spacing: 0.08em`, `--text-muted`
- Td: DM Sans 14px, `--text-primary`
- Números en tabla: DM Mono 13px, `text-align: right`, `font-variant-numeric: tabular-nums`
- Row padding: `10px 16px` (compact default)
- Filas con estado: `border-left: 3px solid var(--urgent/warning/success)` en el `<tr>`

### Iconos

- Base: Lucide icons (viene con shadcn/ui)
- Tamaño estándar: 16px en navegación, 18px en botones, 20px en acciones standalone
- Custom icons solo para conceptos específicos de cocina sin equivalente en Lucide
- Sin emojis en UI

---

## Anti-patterns (nunca hacer)

- No gradientes, nunca
- No glassmorphism ni frosted panels
- No glow ni glowing borders
- No centered hero compositions en app views
- No mosaico de cards de igual peso como pantalla principal
- No border-radius > 10px en componentes de producto
- No ilustraciones decorativas
- No icon grids con texto debajo (patrón marketing) dentro de product UI
- No estados de éxito en azul o teal
- No sombras llamativas (máx `box-shadow: 0 1px 3px rgba(0,0,0,0.3)`)
- No emojis en la interfaz (solo Lucide + custom icons)

---

## Decisions Log

| Fecha | Decisión | Rationale |
|-------|----------|-----------|
| 2026-04-15 | Sistema de color creado | Dark-first: diferenciación funcional frente a todos los competidores que son light mode |
| 2026-04-15 | Accent: #e8e4dc Tungsten White | Warm off-white como único accent — no compite con colores de alerta, evita el purple AI slop |
| 2026-04-15 | Warning: #b87333 copper (no amber) | Funciona mejor en tamaños pequeños, no se confunde con accent |
| 2026-04-15 | Left-border 3px como señal de estado | Ningún competidor en food-ops lo hace. El jefe de cocina lee estado sin enfocar en ningún elemento específico. |
| 2026-04-15 | Dashboard: command band > KPI mosaico | Los competidores dan métricas. ChefOS da la siguiente acción. |
| 2026-04-15 | Syne para display | Geométrica, autoridad sin agresividad. Gratuita (Google Fonts). |
| 2026-04-15 | DM Mono para datos | Monoespaciada: alineación de columnas perfecta, lectura de instrumentos |
| 2026-04-15 | JetBrains Mono para badges/IDs | Stamp-like authority en lot numbers, APPCC IDs, referencias |
| 2026-04-15 | Fotografías opcionales | Soportadas en recetas/catálogo/eventos; no requeridas; placeholder con Lucide |
| 2026-04-15 | Tipografía base 110% (17.6px) | Preferencia confirmada de Israel: legibilidad en pantallas de cocina |
