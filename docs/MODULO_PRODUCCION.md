# Módulo Producción – ChefOS

## Objetivo
El módulo **Producción** convierte la planificación (principalmente desde **Eventos y sus menús**) en **tareas de cocina ejecutables** y trazables.

Producción debe permitir saber:
- **qué** hay que hacer (recetas / elaboraciones / tareas operativas)
- **cuánto** (cantidades escaladas por pax, cuando aplique)
- **para cuándo** (fecha/hora objetivo)
- **quién** lo hace (asignación por persona/turno)
- **estado** (pendiente → en proceso → terminado)
- **origen** (evento / manual / repetitiva)

---

## Dos vistas (según rol)

### 1) Vista Jefe de Cocina (web/desktop)
- Acceso completo a Producción y a la app.
- Planificación global por día/semana.
- Control de cargas por turnos y por personas.
- Crear/editar tareas y asignarlas.
- Gestionar tareas repetitivas.
- Ver producciones generadas desde Eventos (y sus menús).

### 2) Vista Personal (cocineros, etc.) – móvil
- Vista **simple** centrada en “mis tareas”.
- Basada en su **horario semanal** (turnos).
- Acciones:
  - marcar **En proceso**
  - marcar **Terminado**
  - (opcional) añadir comentario / incidencia
- No debe mostrar configuraciones complejas ni planificación global.

---

## Orígenes de tareas en Producción

### A) Desde Eventos (automático)
Cuando un evento (o servicio) tiene menú validado:
- Se generan tareas de producción (recetas/elaboraciones) con cantidades escaladas por pax.
- Se asignan por defecto a un **turno** (p.ej. mañana) y quedan “Pendientes”.
- El jefe de cocina puede reasignar a personas concretas.

### B) Manual (por el Jefe de Cocina)
Permite crear tareas operativas no ligadas a recetas, por ejemplo:
- “Limpiar nevera de carne”
- “Ordenar cámara”
- “Revisar etiquetado”
- “Preparar mise en place de X”

Estas tareas se asignan:
- a un **día**
- a un **turno** (mañana/tarde/noche)
- a una **persona** (opcional; puede asignarse a turno sin persona aún)

### C) Repetitivas (por día/semana)
Tareas recurrentes con reglas:
- diaria / semanal (y opcionalmente mensual)
- por día de la semana (L, M, X…)
- por turno
- opcional: por rol/puesto (si existiera)

Ejemplo:
- “Al terminar el turno: revisar todo el etiquetado” (todos los días, turno cierre)
- “Limpieza profunda de plancha” (semanal, sábado mañana)

---

## Modelo de datos (resumen funcional)

### ProduccionPlan (Plan de producción)
Agrupa tareas por hotel y fecha (y opcionalmente turno).
- id
- hotel_id
- fecha
- turno (opcional)
- estado (abierto/cerrado)

### TareaProduccion
Unidad ejecutable por el equipo.
- id
- hotel_id
- fecha_objetivo (date/datetime)
- turno_objetivo (mañana/tarde/noche)
- titulo
- descripcion (opcional)
- tipo_tarea:
  - receta/elaboración
  - operativa (limpieza, checklist, etc.)
- origen:
  - evento
  - manual
  - repetitiva
- prioridad (baja/media/alta)
- estado:
  - pendiente
  - en_proceso
  - terminado
  - bloqueado (opcional)
- asignado_a (user_id) (opcional)
- creado_por (user_id)
- timestamps (creación/actualización)
- relación opcional:
  - evento_id (si viene de evento)
  - receta_id (si aplica)
  - cantidades (si aplica: JSON/tabla detalle)

### PlantillaRepetitiva (Reglas)
- id
- hotel_id
- titulo / descripcion
- frecuencia: diaria / semanal
- byweekday (si semanal)
- turno_objetivo
- asignado_a (opcional)
- activo (bool)

---

## Estados y reglas operativas

### Flujo de estados (personal)
1. Pendiente
2. En proceso
3. Terminado

Reglas:
- Solo el personal asignado (o del turno) puede marcar su tarea.
- El jefe de cocina puede:
  - reasignar
  - cambiar prioridad
  - reabrir una tarea terminada (si error)

### Validaciones recomendadas
- Evitar duplicar tareas repetitivas ya generadas para un día/turno.
- Si cambia el pax/menú del evento:
  - las tareas ligadas a ese evento pasan a “Pendiente de revisión” (o se regeneran bajo control del jefe).

---

## UI – Vista móvil (Personal)

### Pantalla: “Mi semana”
- Selector de semana (o por defecto semana actual)
- Lista por día:
  - Turno asignado
  - Mis tareas del turno
- Cada tarea:
  - botón “Iniciar” → En proceso
  - botón “Terminar” → Terminado
  - (opcional) comentario/incidencia

### Pantalla: “Hoy”
- resumen rápido del día
- tareas pendientes/en proceso
- indicador de “tareas críticas”

---

## UI – Vista Jefe de Cocina (Desktop)

### Vista 1: Semana (planning)
- Tabla semanal por turnos y personas
- Drag & drop (opcional) para reasignar tareas
- Filtros:
  - turno
  - persona
  - origen (evento/manual/repetitiva)
  - estado
  - prioridad

### Vista 2: Día (operativa)
- Columnas por estado (kanban simple):
  - Pendiente | En proceso | Terminado
- Sección “Generado por eventos” (agrupado por evento)

### Crear tarea manual
- día + turno
- título + descripción
- asignación (persona/turno)
- prioridad

### Repetitivas
- listado de plantillas
- regla (frecuencia, día, turno)
- activar/desactivar

---

## Integraciones con otros módulos

### Eventos → Producción
- Menú validado genera tareas (recetas/elaboraciones) escaladas por pax.
- Las tareas quedan vinculadas al evento para trazabilidad.

### Recetas → Producción
- Producción usa:
  - rendimiento base de receta
  - ingredientes y cantidades
  - escalado por pax

### Compras e Inventario (relación indirecta)
- Producción no compra, pero sus cantidades:
  - alimentan la lista de compras
  - ayudan a chequear inventario
- (Implementación típica) Producción muestra un “estado de abastecimiento”:
  - OK / falta producto / pendiente de compra

---

## Alcance MVP recomendado

### MVP 1 (rápido y usable)
- Vista jefe: día + semana (lista)
- Vista móvil: “mis tareas” por semana
- Estados: pendiente/en proceso/terminado
- Crear tareas manuales
- Generar tareas desde eventos (solo básicas)

### MVP 2
- Repetitivas (diarias/semanales)
- Agrupación por evento
- Prioridades + filtros

### MVP 3
- Kanban + drag&drop
- Incidencias y evidencias (foto/comentario)
- Cierre de plan diario y reportes

---

## Nota final
Producción debe ser **simple para el personal** y **potente para el jefe de cocina**.
La planificación global y la automatización (eventos/recetas) deben existir, pero sin impedir que el jefe asigne tareas manuales y repetitivas del día a día.
