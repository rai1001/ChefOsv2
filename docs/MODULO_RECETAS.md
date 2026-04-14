# Módulo Recetas – ChefOS

## Objetivo
El módulo **Recetas** es la fuente de verdad de:
- **ingredientes** y **cantidades**
- **rendimiento** (pax/unidades base)
- **coste (escandallo)** automático
- conexión con **Productos** (inventario, compras, proveedores)
- generación de **Producción** desde eventos (escalado por pax)

> Regla clave: **todos los ingredientes de una receta son Productos** (o se mapean a un Producto).
> No se permiten ingredientes “libres” sin correspondencia (salvo modo borrador con “pendiente de vincular”).

---

## 1) Principios y reglas de negocio

### Ingredientes = Productos
- Cada línea de ingrediente referencia a un **Producto** existente.
- Si al importar una receta aparece un ingrediente no reconocido:
  - se marca como **Pendiente de mapeo**
  - no puede pasar a “Activa” hasta resolverlo

### Rendimiento y escalado
Cada receta debe definir:
- **rendimiento_base** (ej.: 10 pax / 2 bandejas / 5 litros)
- **unidad_rendimiento** (pax, raciones, litros, unidades)
Producción y Compras escalan:
- `factor = pax_objetivo / rendimiento_base`
- cantidades = cantidades_base × factor

### Versionado
- Las recetas cambian (precios, ingredientes).
- Se recomienda versionado simple:
  - receta “activa”
  - historial de cambios (fecha, usuario, comentario)

---

## 2) Funcionalidades

### A) Crear receta manual (con escandallo automático)
- Formulario guiado:
  1. Nombre + categoría (entrante, principal, postre, salsa, etc.)
  2. Rendimiento base (pax/unidades) + unidad
  3. Tiempo estimado (opcional) + dificultad (opcional)
  4. Ingredientes (seleccionando Productos)
  5. Elaboración / pasos (texto)
  6. Merma / rendimiento real (opcional)
  7. Resultado: **escandallo** (coste total + coste por pax/unidad)

#### Escandallo automático (cómo se calcula)
Para cada ingrediente (Producto):
- cantidad_ingrediente (en unidad receta)
- conversión a unidad de compra/stock (si aplica)
- precio_unitario (del Producto, ver sección Productos)
- coste_linea = cantidad × precio_unitario_convertido

Totales:
- coste_total_receta = suma(costes)
- coste_por_pax = coste_total / rendimiento_base (si unidad = pax)
- coste_por_unidad = coste_total / rendimiento_base (si unidad = unidades)

> Importante: el precio del producto puede venir de:
> - último precio de compra
> - precio medio ponderado
> - precio fijado manualmente (override)
> Eso se define en Productos (recomendado: último precio por defecto + opción de fijar).

### B) Importar recetas (Excel/CSV)
Objetivo:
- importar recetas con ingredientes y cantidades
- mapear ingredientes a Productos

Formato recomendado (2 opciones):

**Opción 1: 2 hojas en Excel**
- Hoja 1: `recetas`
  - receta_id_externa (opcional)
  - nombre
  - categoria
  - rendimiento_base
  - unidad_rendimiento
  - descripcion (opcional)
- Hoja 2: `ingredientes`
  - receta_id_externa (o nombre exacto receta)
  - producto_codigo (o producto_nombre)
  - cantidad
  - unidad_receta (g, kg, l, ml, ud, etc.)

**Opción 2: una sola tabla “larga”**
- nombre_receta
- categoria
- rendimiento_base
- unidad_rendimiento
- producto
- cantidad
- unidad_receta

Reglas de importación:
- si hay `receta_id_externa` → actualizar receta existente
- si no hay → crear y detectar duplicados por nombre (con confirmación/merge en UI)
- si un producto no existe → queda “Pendiente de mapeo” (no activa)

### C) Duplicar receta / plantilla
- “Duplicar” para crear variantes (p.ej. salsa base → salsa base picante)
- Mantiene ingredientes y rendimiento, cambia nombre

### D) Biblioteca de recetas (buscador)
- búsqueda por:
  - nombre
  - categoría
  - ingrediente (producto)
  - coste por pax (rango)
- filtros por hotel (si las recetas son por hotel) o global (si son compartidas)

---

## 3) Modelo de datos (resumen)

### Receta
- id
- hotel_id (opcional: si receta es específica de hotel)
- nombre
- categoria
- rendimiento_base
- unidad_rendimiento
- estado: borrador / activa / archivada
- elaboracion (texto)
- coste_total_cache (opcional)
- coste_por_unidad_cache (opcional)
- version (int) + updated_at + updated_by

### RecetaIngrediente
- id
- receta_id
- producto_id
- cantidad
- unidad_receta
- merma_pct (opcional)
- orden

### Conversión de unidades (si aplica)
- Se recomienda una tabla/config por Producto:
  - unidad_stock (kg, l, ud…)
  - unidad_compra (caja, saco, botella…)
  - factor_conversion (p.ej. 1 caja = 12 botellas)

> Si no hay conversiones, MVP: trabajar en la misma unidad (kg/l/ud) para empezar.

---

## 4) UI propuesta

### Pantalla: Recetas (lista)
- buscador
- filtros
- tabla:
  - nombre
  - categoría
  - rendimiento
  - coste por pax/unidad
  - estado

### Pantalla: Crear/Editar receta
**Pestañas**
1. Datos
2. Ingredientes (selector de productos + cantidades)
3. Elaboración
4. Escandallo (cálculo y desglose)
5. Historial (opcional)

### Escandallo (detalle)
- tabla con:
  - producto
  - cantidad
  - unidad
  - precio unitario
  - coste línea
- total y coste por pax/unidad
- indicador si faltan precios o conversiones

---

## 5) Integraciones

### Recetas → Producción
- Producción crea tareas “elaboración” desde recetas:
  - receta_id
  - cantidades escaladas
  - checklist / pasos (si se quiere)
  - tiempo estimado (opcional)

### Recetas → Compras e Inventario
- Las cantidades de ingredientes alimentan:
  - lista de compras (faltantes)
  - chequeo de stock

### Eventos → Recetas
- Cuando un menú referencia recetas:
  - se calculan cantidades según pax del evento
  - se generan tareas de producción y necesidades de compra

---

## 6) MVP recomendado

### MVP 1 (imprescindible)
- Crear receta manual con ingredientes = productos
- Escandallo automático básico (sin conversiones complejas)
- Importación Excel/CSV con mapeo a productos
- Rendimiento base + escalado por pax

### MVP 2
- Conversión de unidades por producto (caja→unidad, etc.)
- Duplicar receta + versión/historial básico
- Buscador por ingrediente y coste

### MVP 3
- Subrecetas (una receta usa otra receta como ingrediente)
- Mermas y rendimientos avanzados
- Comparación de proveedores / precios alternativos
- Reportes de coste (por evento, por semana, por categoría)

---

## Sugerencias extra (muy recomendables)
1) **Bloquear receta “Activa”** si:
   - hay ingredientes sin producto mapeado
   - faltan precios en productos clave (si se requiere escandallo fiable)
2) Permitir “**precio fijado**” por receta o por ingrediente en casos especiales.
3) Guardar “**coste congelado**” cuando se cierra un evento, para auditoría (los precios cambian).
