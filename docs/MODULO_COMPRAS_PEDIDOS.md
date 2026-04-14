# Módulo Compras y Pedidos – ChefOS

## Objetivo
El módulo **Compras y Pedidos** gestiona todo el ciclo:
**necesidad → pedido → envío → recepción → conciliación**,  
integrando información de **Eventos, Recetas, Producción, Productos e Inventario**.

Debe permitir:
- Agrupar compras por **proveedor**
- Mantener trazabilidad por **evento**, **departamento** y **producto**
- Generar **PDFs oficiales** para el departamento de compras
- Gestionar **recepciones parciales/completas** con evidencia (foto albarán)
- Aplicar **reglas reales de proveedores** (días de entrega, lead time, mínimos)

---

## 1) Conceptos clave (separación obligatoria)

### A) Necesidad
Lo que hace falta comprar.  
Puede venir de:
- Eventos (menús → recetas → productos)
- Producción manual
- Peticiones manuales (cocina, sala, otros)

> Una necesidad **no es todavía un pedido**.

### B) Pedido a proveedor
Documento que se envía a compras/proveedor.
- Siempre **1 proveedor por pedido**
- Agrupa múltiples necesidades (eventos, departamentos)

### C) Recepción / Albarán
Lo que llega físicamente.
- Puede ser:
  - completo
  - parcial
  - con extras
  - con sustituciones

Es lo que **actualiza inventario**.

---

## 2) Flujo de estados (workflow)

Estados recomendados del Pedido:
1. **Borrador**
2. **Pendiente de aprobación**
3. **Aprobado**
4. **Enviado** (PDF generado)
5. **Confirmado por compras** (opcional)
6. **Recibido parcial**
7. **Recibido completo**
8. **Cerrado**

Estados especiales:
- Cancelado
- Incidencia

---

## 3) Agrupación de pedidos (regla clave)
- Un **Pedido = un Proveedor**
- Cada línea del pedido guarda:
  - producto
  - cantidad
  - evento_id (opcional)
  - departamento (cocina / sala / otros)
  - origen (evento / producción / manual)

Esto permite:
- un solo PDF por proveedor
- mismo albarán para cocina y sala
- trazabilidad total por evento

---

## 4) Reglas de proveedor (operativa real)

Cada proveedor tiene una configuración:

### ProveedorConfig
- días de entrega (L/M/X/J/V/S/D)
- hora límite de pedido (cut-off)
- lead time mínimo (ej. 48h)
- pedido mínimo (importe o unidades)
- ventana de recepción (opcional)

### Comportamiento
Al crear/aprobar un pedido:
- se calcula fecha estimada de entrega
- se valida si llega a tiempo para el evento
- se lanza aviso si:
  - pedido fuera de plazo
  - no cumple mínimo

---

## 5) Generación de PDF de pedido

El PDF se genera al pasar a estado **Enviado**.

Contenido mínimo:
- Hotel
- Proveedor
- Referencia del pedido
- Fecha pedido
- Fecha entrega estimada
- Tabla:
  - código proveedor
  - producto
  - formato compra
  - cantidad
  - notas
  - (opcional) evento / departamento

Registros obligatorios:
- PDF guardado en sistema
- usuario que aprobó
- fecha y hora de envío

---

## 6) Recepción de pedidos (móvil – personal)

### Flujo de recepción
1. Seleccionar pedido
2. Botón **Recibir**
3. Para cada línea:
   - cantidad recibida
   - comentario (opcional)
   - flag sustitución (opcional)
4. Subir **foto del albarán**
5. Guardar

### Resultados automáticos
- recibido < pedido → **Recibido parcial**
- recibido = pedido → **Recibido completo**
- recibido > pedido → **Extra recibido** (requiere validación)

---

## 7) Alertas automáticas
- Recepción parcial → “Falta X de Producto Y”
- Impacto por evento:
  - “Falta X para Evento Z (fecha/hora)”
- Pedido no recibido cerca del evento
- Pedido fuera de días de entrega del proveedor

---

## 8) Conciliación con Inventario
En la recepción:
- cada línea impacta inventario según unidad de stock
- sustituciones quedan registradas
- extras se pueden:
  - aceptar (entran a stock)
  - rechazar (no se contabilizan)

Todo queda trazado por:
- pedido
- proveedor
- albarán

---

## 9) Modelo de datos (resumen)

### Necesidad
- id
- origen (evento / producción / manual)
- evento_id (opcional)
- producto_id
- cantidad
- unidad
- departamento
- estado

### Pedido
- id
- hotel_id
- proveedor_id
- estado
- fecha_pedido
- fecha_entrega_estimada
- aprobado_por
- pdf_path

### PedidoLinea
- id
- pedido_id
- producto_id
- cantidad_pedida
- cantidad_recibida
- evento_id (opcional)
- departamento
- estado_linea

### Recepcion / Albaran
- id
- pedido_id
- proveedor_id
- fecha
- imagen_path
- notas

---

## 10) MVP recomendado

### MVP 1
- generar necesidades
- agrupar por proveedor
- crear pedidos
- workflow hasta Enviado
- PDF generado
- recepción parcial/completa con foto
- alertas básicas

### MVP 2
- reglas proveedor (lead time, días entrega)
- impacto por evento visible
- conciliación avanzada

### MVP 3
- sustituciones inteligentes
- reportes por proveedor
- métricas de incidencias

---

## Nota final
Compras es el punto donde más errores cuestan dinero.  
Este diseño prioriza:
- trazabilidad
- control
- flexibilidad real
sin bloquear la operación diaria.
