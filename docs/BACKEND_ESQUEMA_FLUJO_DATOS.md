# Backend – Esquema y Flujo de Datos (ChefOS)

## Objetivo
Este documento define:
- el **esquema mínimo de datos** (entidades/tablas) por módulo
- el **flujo de datos** end-to-end (trazabilidad)
- un patrón simple de **eventos internos** para evitar lógica duplicada

No es un diseño “enterprise”. Es un backend pragmático para MVP.

---

## 1) Principios de backend

### Multi-tenant por hotel
Todas las entidades operativas deben incluir:
- `hotel_id`
y se filtran por hotel activo.

### Trazabilidad por referencias
Casi todo debe poder vincularse a:
- `evento_id` (si aplica)
- `tarea_produccion_id` (si aplica)
- `pedido_id` / `albaran_id` (si aplica)
- `usuario_id` (quién hizo qué)

### No duplicar cálculos
- Recetas calculan cantidades/escandallo
- Inventario es stock real
- Mermas es salida con motivo (impacta inventario)
- Alertas/Automatizaciones consumen señales, no recalculan inventario

---

## 2) Esquema mínimo (tablas principales)

> Nota: nombres orientativos. Ajustar a ORM/DB final.

### Autenticación / Hoteles / Roles
- `user`
- `hotel`
- `user_hotel` (relación)
- `role` / `user_role` (por hotel)

---

### Eventos
- `evento` (id, hotel_id, nombre, fecha_inicio, fecha_fin, pax, tipo, estado, notas)
- `sala`
- `evento_sala`

*(si se implementan servicios por evento más adelante: `evento_servicio`)*

---

### Producción
- `produccion_plan` (hotel_id, fecha, turno, estado)
- `tarea_produccion` (hotel_id, fecha_objetivo, turno_objetivo, tipo_tarea, origen, estado, asignado_a, evento_id?, receta_id?)
- `plantilla_repetitiva`

---

### Recetas
- `receta`
- `receta_ingrediente` (receta_id, producto_id, cantidad, unidad_receta, orden)

---

### Productos / Proveedores / SKUs
- `producto` (hotel_id, nombre, categoria_id, unidad_stock, proveedor_preferido_id?, referencia_preferida_id?, activo)
- `proveedor` (hotel_id, nombre, tipo, notas, activo)
- `proveedor_config` (hotel_id, proveedor_id, dias_entrega, hora_corte, lead_time, min_importe?, min_unidades?)
- `referencia_proveedor` (hotel_id, proveedor_id, producto_id, codigo, unidad_compra, factor_conversion, precio, moneda, updated_at)
- `precio_historial` (opcional en MVP 2)

---

### Compras
- `necesidad` (hotel_id, origen, evento_id?, producto_id, cantidad, unidad, departamento, estado)
- `pedido` (hotel_id, proveedor_id, estado, fecha_pedido, fecha_entrega_estimada, aprobado_por?, pdf_path?)
- `pedido_linea` (pedido_id, producto_id, cantidad_pedida, cantidad_recibida, evento_id?, departamento, estado_linea)
- `albaran` (hotel_id, pedido_id?, proveedor_id, fecha, imagen_path?, notas)

---

### Inventario / Stock
- `lote_inventario` (hotel_id, producto_id, cantidad, unidad_stock, fecha_entrada, fecha_caducidad, proveedor_id?, pedido_id?, albaran_id?, ubicacion_id?)
- `movimiento_inventario` (hotel_id, producto_id, lote_id?, tipo, cantidad, unidad_stock, motivo, origen, referencia_id?, usuario_id, created_at)
- `ubicacion` (MVP 2)

---

### Mermas y Mejora Continua
Opción A (simple y recomendada):
- usar `movimiento_inventario` con `tipo = merma` + `motivo` estructurado

Opción B (si se quiere entidad separada para analítica):
- `merma` (hotel_id, producto_id, cantidad, unidad, motivo, evento_id?, tarea_produccion_id?, proveedor_id?, usuario_id, comentario?, created_at)
- y siempre genera un `movimiento_inventario` asociado.

---

### Alertas
- `alerta` (hotel_id, origen_modulo, origen_id, severidad, titulo, mensaje, destinatarios, estado, created_at, resolved_at?)

---

### Automatizaciones
- `pedido_sugerido` (hotel_id, proveedor_id, fecha_necesidad, fecha_sugerida_pedido, estado, motivo, created_at)
- `pedido_sugerido_linea` (pedido_sugerido_id, producto_id, cantidad_sugerida, unidad, evento_id?, tarea_produccion_id?, comentario?)

---

### Personal y Horarios
- `personal` (hotel_id, nombre, rol_principal, horas_objetivo, activo)
- `turno` (hotel_id, nombre, hora_inicio, hora_fin, tipo)
- `regla_horario` (hotel_id, rol, dias_semana, turno_id, min_personas, max_personas?, prioridad, activa)
- `horario_asignacion` (hotel_id, fecha, turno_id, personal_id, origen, estado)

---

## 3) Flujo de datos (end-to-end)

```mermaid
flowchart TD
    Eventos[Eventos] -->|menús/pax| Recetas[Recetas]
    Recetas -->|ingredientes| Productos[Productos]
    Eventos -->|necesidades| Compras[Compras]
    Produccion[Producción] -->|necesidades| Compras

    Productos -->|SKU + proveedor preferido| Compras
    Proveedores[Proveedores] -->|reglas entrega| Compras

    Compras -->|pedido| Inventario[Inventario]
    Inventario -->|caducidades| Alertas[Alertas]

    Inventario -->|merma (movimiento)| Mermas[Mermas]
    Mermas -->|señales| Alertas
    Automatizaciones[Automatizaciones] -->|pedidos sugeridos| Compras
    Automatizaciones -->|señales| Alertas

    Horarios[Personal/Horarios] -->|turnos| Produccion
    Produccion -->|riesgos| Alertas

    Alertas --> Dashboard[Dashboard]
```

---

## 4) Patrón de “eventos internos” (recomendado)

Para evitar lógica duplicada entre módulos, usar un bus simple (interno):
- tabla `domain_event` o cola interna (según stack)
- eventos generados al cambiar estados clave

### Eventos sugeridos (MVP)
- `evento.updated` (cambio pax/menú/estado)
- `tarea_produccion.updated` (estado/fecha)
- `pedido.sent` / `pedido.received_partial` / `pedido.received_complete`
- `inventario.lote_created` / `inventario.lote_expiring`
- `inventario.merma_recorded`
- `proveedor.incidencia_created`

Consumidores:
- Alertas (crea/actualiza alertas)
- Automatizaciones (crea pedidos sugeridos, predice faltantes)
- Dashboard (solo lectura, consulta)

---

## 5) Reglas de consistencia (MVP)

- Un Pedido = un Proveedor (siempre)
- Inventario descuenta por FIFO (si hay lotes)
- Merma siempre descuenta stock y exige motivo
- Cambios en evento (pax/menú) disparan “revisión” en compras/producción (evento interno)
- Alertas se deduplican por (hotel_id + origen_modulo + origen_id + severidad)

---

## 6) Endpoints mínimos (guía para desarrollo)

### Eventos
- GET /eventos?from&to
- POST /eventos
- PATCH /eventos/:id

### Producción
- GET /produccion?date
- PATCH /tareas/:id (estado/asignación)

### Compras
- GET /necesidades
- POST /pedidos (desde necesidades o manual)
- PATCH /pedidos/:id (estado)
- POST /pedidos/:id/recepcion (crea albarán + lotes)

### Inventario
- GET /stock
- POST /inventario/entrada
- POST /inventario/salida
- POST /inventario/merma

### Mermas
- GET /mermas?from&to (si entidad separada)
- GET /mermas/resumen?periodo

### Alertas
- GET /alertas?estado&severidad
- PATCH /alertas/:id (vista/resuelta)

### Automatizaciones
- GET /pedidos-sugeridos
- POST /pedidos-sugeridos/:id/convertir

### Horarios
- POST /horarios/generar?mes
- GET /horarios?week
- PATCH /horarios/asignacion/:id

### Dashboard
- GET /dashboard (agrega consultas, no lógica)

---

## Nota final
Este documento define un backend:
- trazable
- testable
- sin duplicación de responsabilidades
- escalable por módulos

Es la base para implementar MVP 1 con seguridad.
