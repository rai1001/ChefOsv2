# 🍳 ChefOS v2.0 - Funciones y Estilo de la Aplicación

> **SaaS de gestión para cocinas profesionales con arquitectura limpia y tecnología moderna**

---

## 📋 Tabla de Contenidos

1. [Vista General](#vista-general)
2. [Funcionalidades Core](#funcionalidades-core)
3. [Módulos de la Aplicación](#módulos-de-la-aplicación)
4. [Sistema de Diseño y Estilo](#sistema-de-diseño-y-estilo)
5. [Arquitectura Técnica](#arquitectura-técnica)
6. [Flujos de Usuario](#flujos-de-usuario)

---

## 🎯 Vista General

**ChefOS v2.0** es una plataforma SaaS completa para la gestión integral de cocinas profesionales, restaurantes y hoteles. Combina gestión operativa, análisis de datos y herramientas de IA para optimizar todos los aspectos de una cocina profesional.

### Características Principales:
- ✅ **Gestión Multi-Outlet**: Soporte para múltiples establecimientos
- ✅ **IA Integrada**: Gemini 2.0 para escaneo de documentos y análisis
- ✅ **Clean Architecture**: Código mantenible y escalable
- ✅ **UI Premium**: Diseño moderno con glassmorphism y efectos glow
- ✅ **Tiempo Real**: Sincronización en tiempo real con Supabase
- ✅ **PWA Ready**: Instalable como app nativa

---

## ⚡ Funcionalidades Core

### 1. **Gestión de Inventario FIFO**
- Control de lotes con trazabilidad completa
- Seguimiento de caducidad automático
- Alertas de stock bajo
- Rotación FIFO (First In, First Out)
- Valoración de inventario en tiempo real

### 2. **Fichas Técnicas Versionadas**
- Cálculo automático de costos
- Historial completo de versiones
- Cálculo nutricional automático
- Gestión de alérgenos (EU 1169/2011)
- Export a PDF profesional

### 3. **Compras Automáticas**
- Generación de pedidos basada en demanda predecible
- Integración con proveedores
- Comparación de precios
- Gestión de albaranes y facturas
- Escaneo de facturas con IA

### 4. **HACCP Digital**
- Control de puntos críticos
- Registro de temperaturas
- Alertas críticas automáticas
- Trazabilidad completa
- Cumplimiento normativo

### 5. **Producción Kanban**
- Scheduling inteligente de producción
- Gestión de órdenes en tiempo real
- Kitchen Display System (KDS)
- Modo tablet para cocina
- Optimización de tiempos

### 6. **Analytics & Menu Engineering**
- Matriz de Boston para menús
- Análisis de rentabilidad por plato
- KPIs en tiempo real
- Dashboards interactivos
- Reportes automáticos

### 7. **Integración de IA (Gemini 2.0)**
- Escaneo automático de facturas
- Procesamiento de BEO (Banquet Event Orders)
- Enriquecimiento de ingredientes
- Zero Waste Engine
- Generación de contenido para redes sociales

---

## 📱 Módulos de la Aplicación

### 🏠 **Dashboard (Inicio)**
**Ruta:** `/dashboard`

**Características:**
- KPIs en tiempo real (ventas, costos, mermas, personal)
- Widgets configurables:
  - Horario semanal del personal
  - Eventos mensuales
  - Producción semanal
  - Órdenes pendientes
  - Alertas críticas
  - Notas de compra
  - Zero Waste Widget
- Quick shortcuts para acciones frecuentes
- Export/Import de datos
- Visualización de estado del sistema

**Vista:** Grid responsivo con glassmorphism cards

---

### 📅 **Logística / Operaciones**

#### **1. Horarios (`/schedule`)**
- Gestión de turnos del personal
- Calendario visual
- Asignación automática
- Control de horas
- Export a Excel/PDF

#### **2. Eventos / BEO (`/events`)**
- Gestión de eventos y banquetes
- Procesamiento automático de BEO con IA
- Cálculo de costos y personal
- Timeline de eventos
- Reservas y grupos
- **Modo Hotel**: Logística específica para hoteles

#### **3. Logística Hotel (`/logistics`)** *(Solo para hoteles)*
- Gestión de desayunos
- Room service
- Coordinación con recepción
- Ocupancy tracking

#### **4. Compras Auto (`/purchasing`)**
- Pedidos automáticos basados en demanda
- Gestión de proveedores
- Comparación de precios
- Estado de pedidos
- Albaranes y facturas
- Escaneo con IA

#### **5. Mermas (`/waste`)**
- Registro de desperdicios
- Análisis de causas
- Zero Waste Engine
- Reportes de sostenibilidad

#### **6. HACCP Digital (`/haccp`)**
- Puntos de control crítico
- Registro de temperaturas
- Alertas automáticas
- Cumplimiento normativo

#### **7. Ingeniería de Menú (`/menu-engineering`)**
- Matriz de Boston
- Análisis de popularidad
- Rentabilidad por plato
- Recomendaciones de optimización

---

### 📖 **Estrategia de Menús**

#### **1. Mis Menús (`/menu`)**
- Gestión de cartas y menús
- Diseño visual de menús
- Cálculo automático de costos
- Precios sugeridos
- Versionado de menús

#### **2. Fichas Técnicas (`/fichas`)**
- Creación de recetas detalladas
- Cálculo de costos
- Información nutricional
- Alérgenos
- Fotos y presentación
- Export profesional a PDF

#### **3. Social Manager Pro (`/social-manager`)**
- Generación de contenido con IA
- Programación de publicaciones
- Análisis de engagement
- Gestión multi-plataforma
- Plantillas profesionales

#### **4. Funciones IA (`/ai-features`)**
- Escaneo de documentos
- Enriquecimiento de ingredientes
- Generación de recetas
- Análisis de menús
- Chat copilot

#### **5. IA Telemetría (`/ai-telemetry`)**
- Monitoreo de uso de IA
- Costos por función
- Métricas de tokens
- Optimización de prompts

---

### 🗄️ **Gestión Base**

#### **1. Ingredientes (`/ingredients`)**
- Catálogo completo de ingredientes
- Información nutricional
- Alérgenos
- Proveedores asociados
- Precios históricos
- Importación masiva con Excel
- Enriquecimiento con IA (Gemini)

#### **2. Inventario (`/inventory`)**
- Control de stock en tiempo real
- Sistema FIFO
- Alertas de stock bajo
- Valoración de inventario
- Movimientos detallados
- Trazabilidad completa

#### **3. Recetas (`/recipes`)**
- Biblioteca de recetas
- Escalado automático de cantidades
- Cálculo de costos
- Información nutricional
- Pasos de preparación
- Multimedia (fotos, videos)

#### **4. Proveedores (`/suppliers`)**
- Gestión de proveedores
- Catálogos de productos
- Comparación de precios
- Histórico de pedidos
- Evaluación de proveedores
- Datos de contacto

#### **5. Personal (`/staff`)**
- Gestión de empleados
- Roles y permisos
- Horarios
- Datos de contacto
- Control de acceso

---

### ⚡ **Producción / Modo KDS**

#### **1. Producción (`/production`)**
- Órdenes de producción
- Scheduling de tareas
- Asignación de recursos
- Control de tiempos
- Kanban board

#### **2. Modo KDS (Tablet) (`/kds`)**
- Kitchen Display System
- Vista optimizada para tablet
- Órdenes en tiempo real
- Priorización automática
- Timer por plato
- Notificaciones sonoras

---

### 🔧 **Configuración y Administración**

#### **1. Integraciones (`/integrations`)**
- Conectores con sistemas externos
- APIs disponibles
- Webhooks
- Configuración de servicios

#### **2. Configuración (`/settings`)**
- Datos del establecimiento
- Preferencias de usuario
- Configuración de IA
- Idioma y región
- Moneda
- Formato de fechas
- Notificaciones

#### **3. Administración de Usuarios (`/admin/users`)** *(Solo Admin)*
- Gestión de usuarios
- Roles y permisos
- Invitaciones
- Auditoría de accesos

---

## 🎨 Sistema de Diseño y Estilo

### **Paleta de Colores**

#### **Modo Oscuro (Único)**
```css
background: #111315      /* Deep dark - Fondo principal */
surface: #1A1D1F         /* Dark card background */
primary: #22c55e         /* Vibrant Green - Acento principal */
secondary: #94a3b8       /* Slate 400 - Texto secundario */
accent: #10b981          /* Emerald 500 - Acento complementario */
success: #22c55e         /* Verde - Éxito */
warning: #f59e0b         /* Amber 500 - Advertencia */
error: #ef4444           /* Red 500 - Error */
```

#### **Gradientes**
- **Fondo principal**: Radial gradients con tonos azul índigo y amber
- **Títulos**: Gradient de `primary` a `accent`
- **Glass effects**: Gradientes sutiles con transparencia

---

### **Tipografía**

- **Familia**: `Inter` (sistema sans-serif moderno)
- **Pesos**:
  - Black (900): Títulos principales
  - Bold (700): Subtítulos
  - Semibold (600): Labels
  - Medium (500): Texto enfatizado
  - Regular (400): Texto normal

#### **Escala Tipográfica**
```
h1: 4xl-5xl (2.25-3rem) - Títulos de página
h2: 3xl (1.875rem) - Secciones principales
h3: 2xl (1.5rem) - Subsecciones
h4: xl (1.25rem) - Widgets
body: base (1rem) - Texto normal
small: sm (0.875rem) - Texto secundario
micro: xs (0.75rem) - Labels
```

---

### **Efectos Visuales**

#### **1. Glassmorphism**
```css
.glass {
  background: rgba(26, 29, 31, 0.7);
  backdrop-filter: blur(32px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
}
```

**Uso:**
- Tarjetas principales
- Modales
- Sidebar en móvil
- Popovers

#### **2. Glow Effects**
```css
.glow-border:hover {
  border-color: rgba(34, 197, 94, 0.4);
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.2);
}

.text-glow {
  text-shadow: 0 0 15px rgba(34, 197, 94, 0.6);
}
```

**Uso:**
- Hover en tarjetas interactivas
- Títulos principales
- Botones primarios
- Estados activos

#### **3. Animaciones**

**Glow Pulse:**
```css
@keyframes glow-pulse {
  0%, 100% { opacity: 0.8; filter: brightness(1); }
  50% { opacity: 1; filter: brightness(1.4); }
}
```

**Fade In Up:**
```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Aplicación:**
- Entrada de páginas
- Carga de widgets
- Transiciones de estado
- Tooltips

---

### **Componentes UI**

#### **Iconografía**
- **Librería**: Lucide React
- **Tamaño estándar**: 20-24px
- **Colores**: `text-slate-400` (normal), `text-primary` (activo)

#### **Botones**
```tsx
// Primario
<button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all">
  Acción Principal
</button>

// Secundario
<button className="px-4 py-2 bg-surface border border-white/10 text-slate-300 rounded-lg hover:border-primary/40 transition-all">
  Acción Secundaria
</button>

// Peligro
<button className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 transition-all">
  Eliminar
</button>
```

#### **Tarjetas**
```tsx
<div className="glass-card p-6">
  {/* Contenido */}
</div>

<div className="premium-glass p-6">
  {/* Contenido con efecto hover glow */}
</div>
```

#### **Inputs**
```tsx
<input
  className="w-full px-4 py-2 bg-surface border border-white/10 rounded-lg text-slate-100
             focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
  type="text"
/>
```

---

### **Navegación**

#### **Sidebar**
- **Ancho**: 256px (16rem)
- **Comportamiento**:
  - Desktop: Fijo, siempre visible
  - Mobile: Overlay con animación slide
- **Estructura**:
  - Logo ChefOS
  - Selector de Outlet
  - Navegación agrupada por categorías
  - Perfil de usuario con logout

#### **Grupos de Navegación**
1. **Logística / Operaciones** (Layers icon)
2. **Estrategia Menús** (BookOpen icon)
3. **Gestión Base** (Database icon)
4. **Producción / Modo KDS** (Zap icon)
5. **Administración** (ShieldCheck icon) - Solo admin

#### **NavItem States**
- **Normal**: `text-slate-400`
- **Hover**: `bg-white/5 text-slate-200`
- **Activo**: `bg-primary/10 text-primary border-l-2 border-primary`

---

### **Scrollbars Personalizados**
```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-thumb {
  background: rgba(71, 85, 105, 0.5);
  border-radius: 9999px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.5);
}
```

---

### **Responsive Design**

#### **Breakpoints**
```javascript
sm: '640px'   // Móvil grande
md: '768px'   // Tablet
lg: '1024px'  // Desktop
xl: '1280px'  // Desktop grande
2xl: '1536px' // Pantallas 4K
```

#### **Estrategia Mobile-First**
- Layouts de una columna en móvil
- Grid adaptativo con Tailwind
- Sidebar overlay en móvil
- Componentes touch-friendly
- Tipografía escalable

---

## 🏗️ Arquitectura Técnica

### **Stack Tecnológico**

#### **Frontend**
- **Framework**: React 19
- **TypeScript**: Strict mode
- **Build Tool**: Vite 6
- **Estilo**: Tailwind CSS 3.4
- **Routing**: React Router 7
- **Estado**:
  - Zustand (estado global)
  - Jotai (estado atómico)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Icons**: Lucide React
- **Toasts**: Sonner

#### **Backend**
- **Principal**: Supabase
  - PostgreSQL database
  - Realtime subscriptions
  - Edge Functions (Deno)
  - Authentication
  - Storage
- **Legacy**: Firebase (en migración)
  - Firestore
  - Cloud Functions
  - Storage
  - Authentication

#### **IA / ML**
- **Modelo**: Gemini 2.0 Flash Experimental
- **Edge Functions**:
  - `scan-document`: OCR de facturas y documentos
  - `enrich-ingredient`: Información nutricional
  - `chat-copilot`: Asistente conversacional
  - `generate-menu`: Generación de menús

#### **Testing**
- **Unit**: Vitest
- **E2E**: Playwright
- **Component**: Testing Library
- **Coverage**: >80%

---

### **Arquitectura Clean**

```
packages/web/src/
├── domain/              # Entidades de negocio
│   ├── entities/        # Ingredient, Recipe, Order...
│   ├── value-objects/   # Money, Quantity, DateRange...
│   └── interfaces/      # Contratos de repositorios
├── application/         # Casos de uso
│   ├── use-cases/       # CreateRecipe, ProcessOrder...
│   └── di/              # Inversify container
├── infrastructure/      # Implementaciones
│   ├── repositories/    # Supabase, Firebase adapters
│   └── services/        # APIs externas
└── presentation/        # UI Layer
    ├── pages/           # Páginas de ruta
    ├── components/      # Componentes React
    ├── hooks/           # Custom hooks
    └── store/           # Estado global
```

#### **Principios**
- **Dependency Inversion**: Use cases no dependen de frameworks
- **Single Responsibility**: Cada clase tiene una responsabilidad
- **Open/Closed**: Abierto a extensión, cerrado a modificación
- **Testabilidad**: Inyección de dependencias con Inversify

---

### **Gestión de Estado**

#### **Zustand Store**
```typescript
// Global app state
interface AppStore {
  currentUser: User | null;
  selectedOutlet: Outlet | null;
  settings: Settings;
  // ... actions
}
```

**Slices:**
- Auth
- Outlets
- Settings
- UI (modales, loaders)

#### **Jotai Atoms**
```typescript
// Atomic state for fine-grained reactivity
export const userAtom = atom<User | null>(null);
export const outletAtom = atom<Outlet | null>(null);
```

**Ventajas:**
- Re-renders optimizados
- Fácil testing
- Composición de estado

---

## 👤 Flujos de Usuario

### **1. Onboarding / Login**
1. Usuario accede a `/login`
2. Login con email/password o SSO
3. Selección de outlet (si tiene múltiples)
4. Redirección a `/dashboard`

### **2. Gestión de Inventario**
1. **Ver stock**: `/inventory` → Lista de ingredientes con cantidades
2. **Entrada de mercancía**:
   - Escanear factura con IA → Parse automático
   - O entrada manual
   - Asignación de lote y caducidad
   - Actualización de stock FIFO
3. **Alertas**: Stock bajo → Notificación → Crear orden de compra

### **3. Creación de Ficha Técnica**
1. `/fichas` → Nueva ficha
2. Seleccionar ingredientes del catálogo
3. Definir cantidades
4. **IA calcula automáticamente**:
   - Costo total
   - Información nutricional
   - Alérgenos
5. Añadir pasos de preparación
6. Subir fotos
7. Guardar y versionar

### **4. Compra Automática**
1. Sistema analiza:
   - Stock actual
   - Demanda histórica
   - Eventos próximos
   - Caducidades
2. Genera sugerencias de pedido
3. Usuario revisa y aprueba
4. Envío automático a proveedores
5. Recepción y escaneo de albarán
6. Actualización de inventario

### **5. Producción con KDS**
1. Chef recibe órdenes en `/kds`
2. Pantalla tipo Kanban:
   - **Pendiente** → **En Producción** → **Listo**
3. Arrastrar tarjetas entre columnas
4. Timer automático por plato
5. Notificaciones de servicio

### **6. Análisis de Menú**
1. `/menu-engineering`
2. Visualización Matriz de Boston:
   - **Estrellas**: Alta popularidad + Alta rentabilidad
   - **Vacas Lecheras**: Baja popularidad + Alta rentabilidad
   - **Interrogantes**: Alta popularidad + Baja rentabilidad
   - **Perros**: Baja popularidad + Baja rentabilidad
3. Recomendaciones de optimización:
   - Subir precio
   - Reducir costo
   - Promocionar
   - Eliminar

---

## 🔐 Seguridad y Permisos

### **Roles**
- **Admin**: Acceso total
- **Manager**: Gestión operativa
- **Chef**: Producción y recetas
- **Staff**: Lectura limitada

### **Row Level Security (RLS)**
- Políticas en Supabase por outlet
- Los usuarios solo ven datos de su(s) outlet(s)
- Auditoría de cambios

### **Autenticación**
- JWT con Supabase Auth
- Refresh tokens automáticos
- Session timeout configurable
- SSO disponible (Google, Azure)

---

## 📊 KPIs y Métricas

### **Dashboard Principal**
- **Ventas del Día**: Ingresos actuales
- **Food Cost %**: Porcentaje de costo de ingredientes
- **Mermas**: Desperdicio del día/semana
- **Personal Activo**: Empleados en turno
- **Órdenes Pendientes**: Producción activa
- **Alertas Críticas**: HACCP, stock, caducidades

### **Analytics Avanzados**
- Tendencias de ventas (día/semana/mes)
- Food cost evolution
- Popularidad de platos
- Rentabilidad por categoría
- Rotación de inventario
- Productividad del personal

---

## 🚀 Funcionalidades Premium / Futuras

- [ ] **Multi-idioma** (i18n con react-i18next)
- [ ] **Multi-moneda** con conversión automática
- [ ] **Forecasting con ML** para demanda predictiva
- [ ] **Integración contable** (Sage, QuickBooks)
- [ ] **App móvil nativa** (React Native)
- [ ] **Voice commands** para KDS
- [ ] **Reconocimiento de imágenes** para control de calidad
- [ ] **Blockchain** para trazabilidad
- [ ] **Marketplace** de proveedores

---

## 📝 Convenciones de Código

### **Nombres de Archivos**
- Componentes: `PascalCase.tsx`
- Hooks: `use*.ts`
- Utils: `camelCase.ts`
- Types: `*.types.ts`

### **Estructura de Componentes**
```tsx
// 1. Imports
import { useState } from 'react';

// 2. Types
interface Props {
  // ...
}

// 3. Component
export const MyComponent: React.FC<Props> = ({ prop }) => {
  // Hooks
  const [state, setState] = useState();

  // Handlers
  const handleClick = () => {};

  // Render
  return (
    <div className="glass-card">
      {/* JSX */}
    </div>
  );
};
```

### **Commits**
- Conventional Commits
- `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`

---

## 🎓 Recursos Adicionales

- **Storybook**: Catálogo de componentes UI
- **Documentación**: `/docs` en el repo
- **API Docs**: OpenAPI spec disponible
- **Figma**: Design system completo
- **Changelog**: Historial de versiones

---

**Última actualización:** 2026-01-04
**Versión:** 2.0.0
**Autor:** Equipo ChefOS con asistencia de Claude Code

---

## 💡 Notas Finales

ChefOS v2.0 representa una reescritura completa pensada para escalar. La arquitectura limpia permite:
- Añadir nuevos módulos sin afectar existentes
- Cambiar frameworks (React → Vue) sin tocar domain layer
- Testing exhaustivo de cada capa
- Onboarding rápido de nuevos desarrolladores

El diseño UI glassmorphism con efectos glow proporciona una experiencia premium que refleja la calidad del producto, mientras que la integración de IA (Gemini 2.0) automatiza tareas tediosas y mejora la productividad.

**Para desarrolladores**: Revisa `ARCHITECTURE.md` y `CONTRIBUTING.md`
**Para diseñadores**: Consulta el Storybook y Figma
**Para usuarios**: Manual de usuario disponible en la app

---

🍳 **¡Bon Appétit!**
