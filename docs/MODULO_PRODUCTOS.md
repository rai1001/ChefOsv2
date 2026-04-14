# Módulo Productos – ChefOS

## Contexto
En ChefOS, **Productos** es el catálogo maestro que alimenta:
- Recetas (ingredientes y escandallos)
- Eventos (necesidades por pax)
- Producción (tareas y consumos)
- Compras (a quién comprar y cuánto)
- Inventario/Stock (existencias)

La empresa es internacional y ya existe un programa externo de compras con **todas las referencias**.  
ChefOS debe permitir **importar por Excel** los productos usados en cada hotel y **re-importar** para actualizar precios y añadir nuevos, evitando duplicados.

---

## Objetivo
1) Importar productos por hotel desde Excel (catálogo local del hotel).  
2) Re-importar (update) para:
   - actualizar precio
   - añadir productos nuevos
   - (opcional) inactivar productos que ya no se usan  
3) Separar y filtrar productos:
   - por **tipo/categoría**
   - por **proveedor**
4) Conectar productos a:
   - recetas (ingredientes)
   - compras (proveedor preferido)
   - inventario (unidad de stock)
   - producción (consumo y planificación)

---

## Conceptos clave (modelo recomendado)

### 1) Producto (interno)
Representa el “ingrediente” o ítem de uso en cocina/operación.
Ejemplos:
- “Leche entera”
- “Aceite oliva virgen 5L”
- “Pechuga de pollo”

### 2) Proveedor
Entidad de proveedor (distribuidor) que vende productos.

### 3) Referencia de compra (SKU proveedor)
Una misma “idea” de producto puede existir con distintas referencias según proveedor (formato, marca, etc.).
Esta entidad guarda el código real y el precio de compra.

> Recomendación: separar **Producto** (interno) de **ReferenciaProveedor** (SKU) para evitar duplicados y permitir multi-proveedor.

---

## Regla anti-duplicados (crítica)
**Si es el mismo producto y el mismo proveedor, solo actualizar precio (y campos) sin duplicar.**

### Clave única recomendada
- `hotel_id` + `proveedor_id` + `codigo_proveedor`

Si no existe código fiable:
- `hotel_id` + `proveedor` + `nombre_normalizado` + `formato` (menos fiable)

---

## Importación Excel (alta inicial + actualización)

### Comportamiento
- Si existe la clave (hotel + proveedor + código) → **UPDATE**
  - actualizar precio
  - actualizar formato/unidades si cambian
  - mantener el producto interno asociado
- Si no existe → **CREATE**
- (Opcional) Si un producto ya no viene en el Excel → marcar **inactivo**

### Columnas recomendadas (Excel)
**Obligatorias**
- hotel (o hotel_id)
- proveedor (o proveedor_id)
- codigo_proveedor  *(ideal, clave principal para updates)*
- nombre
- categoria (tipo)
- precio
- moneda (si aplica)

**Muy recomendadas**
- unidad_compra (caja, saco, botella, etc.)
- contenido_compra (ej.: 12x1L, 5kg, 1ud)
- unidad_stock (kg, l, ud)
- factor_conversion (ej.: 1 caja = 12 ud)
- iva (opcional)
- activo (opcional)

### Validaciones en import
- precio numérico y > 0
- categoría válida (o se crea como “sin clasificar”)
- unidades reconocidas
- si falta proveedor o código → error (o modo “pendiente de resolver”)

---

## Clasificación y navegación (UI)

### Lista de Productos
- buscador por nombre/código
- filtros:
  - categoría (tipo)
  - proveedor
  - activo/inactivo
  - rango de precio
- columnas:
  - nombre
  - categoría
  - proveedor preferido
  - precio actual (de referencia preferida)
  - unidad stock/compra

### Vista por Categoría
- árbol/lista de categorías
- productos dentro

### Vista por Proveedor
- lista de proveedores
- sus referencias (SKUs) y precios

---

## Proveedor preferido (para compras automáticas)
Para cada producto interno (por hotel):
- `proveedor_preferido_id`
- `referencia_preferida_id` (SKU)

Así, cuando falte stock, ChefOS sabe:
- a quién comprar
- qué código usar
- qué precio estimado aplicar

---

## Integración con Recetas (ingredientes)
### Regla
**Todos los ingredientes de recetas deben mapear a Productos**.

- Si una receta importada trae un ingrediente que no existe:
  - se marca “Pendiente de mapeo”
  - la receta no puede pasar a “Activa” hasta resolverlo

### Escandallo
El coste se calcula usando:
- precio de la referencia preferida (por defecto)
- o último precio (si se guarda histórico)
- (opcional) precio fijado manualmente

---

## Integración con Compras e Inventario

### Inventario
Cada producto define:
- unidad_stock (kg/l/ud)
- conversiones desde la unidad de compra

### Compras (cuando falta stock)
Entrada desde:
- eventos → recetas → ingredientes
- producción → ingredientes necesarios

Proceso:
1) calcular requerido total
2) restar stock disponible (inventario)
3) agrupar faltantes por:
   - proveedor preferido
4) generar lista de compra / pedido sugerido

Salida:
- “Comprar X de Producto A a Proveedor Y”
- incluye:
  - código proveedor
  - formato de compra
  - cantidad a pedir
  - precio estimado

---

## Modelo de datos (resumen)

### Producto
- id
- hotel_id
- nombre
- categoria_id
- unidad_stock
- proveedor_preferido_id (opcional)
- referencia_preferida_id (opcional)
- activo (bool)

### Proveedor
- id
- nombre
- datos contacto (opcional)
- activo (bool)

### ReferenciaProveedor (SKU)
- id
- hotel_id
- proveedor_id
- producto_id (interno)
- codigo_proveedor
- nombre_en_proveedor (opcional)
- unidad_compra
- contenido_compra
- factor_conversion
- precio
- moneda
- iva (opcional)
- updated_at

### CategoriaProducto
- id
- hotel_id (opcional si es global)
- nombre
- orden (opcional)

---

## Historial de precios (recomendación)
Guardar cambios de precio:
- referencia_proveedor_id
- precio_anterior
- precio_nuevo
- fecha
- origen (import/manual)

Esto ayuda a:
- detectar subidas
- analizar coste real de eventos

---

## MVP recomendado

### MVP 1 (imprescindible)
- Import Excel (alta + update por hotel+proveedor+código)
- Lista con filtros por categoría/proveedor
- Proveedor preferido + referencia preferida
- Unidades stock/compra básicas + conversión simple

### MVP 2
- Histórico de precios
- Inactivar si no viene en el import
- Comparación de proveedores por producto

### MVP 3
- Sustituciones (producto alternativo)
- Reglas de compra (mínimos, packs)
- Recomendación proveedor por coste/entrega

---

## Nota final
Si Productos está bien definido, el resto del sistema (Recetas, Eventos, Producción, Compras e Inventario) se vuelve automático y coherente.
La clave técnica y funcional es:
- **clave única de import**
- **proveedor preferido**
- **conversiones de unidades**
- **precios fiables**
