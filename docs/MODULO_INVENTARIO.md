# Módulo Inventario / Stock – ChefOS

## Objetivo
El módulo **Inventario / Stock** controla existencias reales en cocina y almacén, incluyendo:
- **lotes y caducidades**
- entradas por **albarán** (foto + introducción manual)
- salidas por **consumo/producción**
- **mermas** con trazabilidad y mejora de rendimiento
- acceso simplificado **desde móvil** para cocineros

Este módulo alimenta:
- Compras/Pedidos (faltantes y recepción)
- Recetas (escandallos y rendimiento real)
- Producción (consumos y planificación)
- Eventos (necesidades por pax)

---

## Principio clave
> El inventario se gestiona mediante **acciones simples** (recibir, sacar, merma, ajuste),
> no con pantallas complejas de “contar todo” cada vez.

---

## 1) Inventario por lotes (caducidades)

### ¿Por qué lotes?
Para controlar caducidades y trazabilidad real, cada entrada crea **lotes**.

### Lote
Un lote representa una entrada de un producto con su caducidad:
- producto_id
- cantidad
- unidad_stock
- fecha_entrada
- fecha_caducidad (obligatoria cuando aplique)
- proveedor_id (opcional)
- pedido_id (opcional)
- albaran_id (opcional)
- ubicación (almacén, cámara, congelador…) (opcional)
- notas (opcional)

### FIFO automático
Al consumir/sacar stock:
- el sistema descuenta primero del **lote más antiguo** (FIFO)
- así se minimiza merma por caducidad

---

## 2) Entradas de inventario (albaranes)

### A) Recepción desde Pedido (recomendado)
Flujo:
1. Seleccionar pedido
2. Foto del albarán (móvil)
3. Confirmar cantidades recibidas
4. Añadir caducidades por línea (si aplica)
5. Guardar

Resultados:
- crea lotes
- actualiza stock
- estado del pedido:
  - recibido parcial / completo

### B) Entrada manual (sin pedido)
Flujo:
1. Seleccionar producto
2. Cantidad + unidad
3. Caducidad (si aplica)
4. Foto albarán (opcional)
5. Guardar

---

## 3) Productos sin código de barras (ej. naranjas)
No se debe forzar código de barras.

### Selección de producto en móvil
- búsqueda por nombre
- categorías
- favoritos (top usados)
- escaneo solo si existe código

### Múltiples códigos por producto
Un producto puede tener:
- 0, 1 o múltiples EAN/códigos
- todos apuntan al mismo Producto interno

Esto evita duplicados cuando cambia proveedor/formato.

---

## 4) Salidas de inventario (consumo)

### Acción: “Sacar del almacén”
Desde móvil:
- seleccionar producto
- cantidad
- motivo:
  - producción
  - consumo directo
  - evento (opcional)
  - merma (si es desperdicio inmediato)
- (opcional) comentario

Comportamiento:
- descuenta por FIFO
- registra movimiento para trazabilidad

---

## 5) Mermas (módulo especial)

### Objetivo
Registrar desperdicio con motivo y trazabilidad para mejorar rendimiento y coste.

### Registro de merma
Campos:
- producto_id
- cantidad
- fecha
- motivo (enum):
  - caducidad
  - sobreproducción
  - error preparación
  - mala conservación
  - devolución / incidencia
  - otros
- evento_id (opcional)
- tarea_produccion_id (opcional)
- usuario_id (quién registra)
- comentario (opcional)
- foto (opcional)

Comportamiento:
- descuenta stock (FIFO)
- genera estadísticas de merma

---

## 6) Ajustes e inventario físico
Además de entradas/salidas, se necesita ajuste.

### Ajuste de stock (manual)
- producto_id
- cantidad_real
- motivo:
  - inventario físico
  - corrección error
  - rotura/accidente
- comentario

El sistema calcula:
- diferencia vs stock teórico
- registra movimiento de ajuste

---

## 7) Alertas de caducidad
- caduca en 48h / 7 días (configurable)
- lotes “olvidados” (sin movimiento X días)
- productos con merma alta

Acciones rápidas:
- “Priorizar consumo”
- “Registrar merma”
- “Mover ubicación”

---

## 8) Integración con Recetas, Producción, Compras

### Recetas
- ingredientes son Productos
- escandallo depende de precios en Productos
- Inventario aporta datos reales de merma:
  - mejora rendimiento estimado
  - reduce desviación coste real

### Producción
- al terminar elaboraciones se puede:
  - registrar consumo real (avanzado)
  - o consumir por receta (estimado)

### Compras
- faltantes = requerido (eventos/producción) – stock disponible
- recepción actualiza inventario y cierra pedidos

---

## 9) UI – Móvil (cocineros)

Pantallas mínimas:
1. **Recibir mercancía**
2. **Sacar producto**
3. **Registrar merma**
4. **Caducidades próximas**

Diseño:
- flujos cortos
- botones grandes
- favoritos y búsqueda rápida

---

## 10) UI – Web (jefe / administración)

Vistas:
- Stock actual por categoría / ubicación
- Lotes por producto (caducidades)
- Movimientos (entradas/salidas/ajustes)
- Mermas (por producto, motivo, semana, evento)
- Configuración:
  - ubicaciones
  - alertas de caducidad
  - motivos de merma

---

## 11) Modelo de datos (resumen)

### StockActual (opcional, cache)
- producto_id
- hotel_id
- cantidad_total
- unidad_stock
- updated_at

### LoteInventario
- id
- producto_id
- hotel_id
- cantidad
- unidad_stock
- fecha_entrada
- fecha_caducidad
- proveedor_id (opcional)
- albaran_id (opcional)
- ubicacion_id (opcional)

### MovimientoInventario
- id
- hotel_id
- producto_id
- lote_id (opcional)
- tipo:
  - entrada
  - salida
  - merma
  - ajuste
- cantidad
- unidad_stock
- motivo (enum)
- origen (pedido/evento/producción/manual)
- referencia_id (pedido_id/evento_id/tarea_id…)
- usuario_id
- created_at

### Albaran
- id
- proveedor_id
- pedido_id (opcional)
- fecha
- imagen_path
- notas

### Merma (opcional si no se usa MovimientoInventario como único)
- id
- producto_id
- cantidad
- motivo
- evento_id (opcional)
- tarea_id (opcional)
- usuario_id
- foto_path (opcional)
- created_at

---

## 12) MVP recomendado

### MVP 1 (imprescindible)
- lotes + caducidades
- FIFO en salidas
- recepción con foto + entradas manuales
- salida “sacar del almacén” desde móvil
- mermas con motivo
- alertas básicas de caducidad

### MVP 2
- ubicaciones (cámara, congelador…)
- ajustes de inventario físico
- reportes de merma por semana/producto
- favoritos en móvil

### MVP 3
- OCR de albaranes
- consumo real por tarea/receta
- sugerencias automáticas de mejora rendimiento

---

## Nota final
Inventario debe ser **rápido para cocineros** y **trazable para gestión**.
La combinación de:
- lotes + FIFO
- entradas por albarán con foto
- salidas simples
- mermas estructuradas
hace que el sistema sea usable y aporte valor real desde el primer día.
