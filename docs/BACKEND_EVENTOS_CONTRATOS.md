# BACKEND_EVENTOS_CONTRATOS.md
## ChefOS – Contratos de Eventos Internos y DTOs

## Objetivo
Este documento define los **payloads exactos (schemas / DTOs)** de los
**eventos internos (domain events)** usados en ChefOS para desacoplar módulos.

Estos eventos:
- NO son eventos externos (webhooks)
- NO sustituyen endpoints REST
- Se usan internamente para Alertas, Automatizaciones y Dashboard

Formato neutral (JSON), independiente del stack.

---

## Convenciones generales

Todos los eventos comparten:

```json
{
  "event_id": "uuid",
  "event_type": "string",
  "occurred_at": "ISO-8601",
  "hotel_id": "uuid",
  "actor_user_id": "uuid | null",
  "payload": {}
}
```

- `event_type` = nombre canónico (ver listado)
- `actor_user_id` puede ser null si es automático
- `payload` es específico por evento

---

## 1️⃣ Eventos de Eventos (core)

### evento.updated
Se emite cuando cambia información relevante del evento.

**Dispara:**
- revisión de producción
- revisión de compras
- alertas de riesgo

```json
{
  "event_type": "evento.updated",
  "payload": {
    "evento_id": "uuid",
    "changes": {
      "pax": { "old": 80, "new": 120 },
      "fecha_inicio": { "old": "2026-02-01T12:00", "new": "2026-02-01T13:00" },
      "menu_id": { "old": "uuid", "new": "uuid" }
    },
    "estado": "confirmado"
  }
}
```

---

### evento.cancelled
```json
{
  "event_type": "evento.cancelled",
  "payload": {
    "evento_id": "uuid",
    "motivo": "string"
  }
}
```

---

## 2️⃣ Eventos de Producción

### tarea_produccion.created
```json
{
  "event_type": "tarea_produccion.created",
  "payload": {
    "tarea_id": "uuid",
    "fecha_objetivo": "2026-02-01",
    "turno": "mañana",
    "tipo_tarea": "elaboracion",
    "evento_id": "uuid | null",
    "receta_id": "uuid | null"
  }
}
```

---

### tarea_produccion.updated
```json
{
  "event_type": "tarea_produccion.updated",
  "payload": {
    "tarea_id": "uuid",
    "estado": {
      "old": "pendiente",
      "new": "en_proceso"
    },
    "fecha_objetivo": "2026-02-01",
    "turno": "mañana"
  }
}
```

---

## 3️⃣ Eventos de Compras

### pedido.sent
```json
{
  "event_type": "pedido.sent",
  "payload": {
    "pedido_id": "uuid",
    "proveedor_id": "uuid",
    "fecha_entrega_estimada": "2026-01-30",
    "impacta_eventos": ["uuid", "uuid"]
  }
}
```

---

### pedido.received_partial
```json
{
  "event_type": "pedido.received_partial",
  "payload": {
    "pedido_id": "uuid",
    "faltantes": [
      {
        "producto_id": "uuid",
        "cantidad_faltante": 5,
        "unidad": "kg"
      }
    ],
    "impacta_eventos": ["uuid"]
  }
}
```

---

### pedido.received_complete
```json
{
  "event_type": "pedido.received_complete",
  "payload": {
    "pedido_id": "uuid",
    "fecha_recepcion": "2026-01-28T09:30"
  }
}
```

---

## 4️⃣ Eventos de Inventario

### inventario.lote_created
```json
{
  "event_type": "inventario.lote_created",
  "payload": {
    "lote_id": "uuid",
    "producto_id": "uuid",
    "cantidad": 20,
    "unidad": "kg",
    "fecha_caducidad": "2026-02-05",
    "origen": "pedido | produccion | manual",
    "evento_id": "uuid | null"
  }
}
```

---

### inventario.lote_expiring
```json
{
  "event_type": "inventario.lote_expiring",
  "payload": {
    "lote_id": "uuid",
    "producto_id": "uuid",
    "fecha_caducidad": "2026-01-30",
    "horas_restantes": 48
  }
}
```

---

### inventario.merma_recorded
```json
{
  "event_type": "inventario.merma_recorded",
  "payload": {
    "producto_id": "uuid",
    "cantidad": 3,
    "unidad": "kg",
    "motivo": "caducidad",
    "evento_id": "uuid | null",
    "tarea_produccion_id": "uuid | null"
  }
}
```

---

## 5️⃣ Eventos de Proveedores

### proveedor.incidencia_created
```json
{
  "event_type": "proveedor.incidencia_created",
  "payload": {
    "proveedor_id": "uuid",
    "pedido_id": "uuid",
    "tipo": "retraso | falta_producto | sustitucion | calidad",
    "impacta_evento": true
  }
}
```

---

## 6️⃣ Eventos de Automatizaciones

### automatizacion.pedido_sugerido
```json
{
  "event_type": "automatizacion.pedido_sugerido",
  "payload": {
    "pedido_sugerido_id": "uuid",
    "proveedor_id": "uuid",
    "fecha_necesidad": "2026-02-01",
    "productos": [
      {
        "producto_id": "uuid",
        "cantidad": 10,
        "unidad": "kg",
        "evento_id": "uuid"
      }
    ]
  }
}
```

---

## 7️⃣ Consumo de eventos por módulo

| Evento | Alertas | Automatizaciones | Dashboard |
|------|--------|------------------|-----------|
| evento.updated | ✅ | ✅ | ✅ |
| tarea_produccion.updated | ✅ | ❌ | ✅ |
| pedido.sent | ❌ | ❌ | ✅ |
| pedido.received_partial | ✅ | ❌ | ✅ |
| inventario.lote_expiring | ✅ | ❌ | ✅ |
| inventario.merma_recorded | ✅ | ✅ | ✅ |
| proveedor.incidencia_created | ✅ | ❌ | ✅ |
| automatizacion.pedido_sugerido | ❌ | ❌ | ✅ |

---

## Regla de oro
> **Los módulos nunca se llaman directamente entre sí para lógica.**  
> Emiten eventos → otros módulos reaccionan.

Esto mantiene ChefOS:
- escalable
- testeable
- sin dependencias frágiles
