# Módulo Eventos – ChefOS

## Objetivo
El módulo **Eventos** gestiona todos los eventos de un hotel y es la fuente principal de planificación para Producción, Compras e Inventario.  
No crea horarios ni gestiona personal directamente.

---

## Funcionalidades principales

### 1. Calendario
- Vista **mensual**
- Vista **semanal**
- Filtros:
  - Hotel activo
  - Salones / salas
  - Tipo de evento
  - Estado del evento

---

## 2. Gestión de eventos

### Crear / editar evento (manual)
Campos principales:
- Nombre del evento
- Hotel
- Fecha y hora de inicio / fin
- Número de pax
- Tipo de evento:
  - Comida
  - Cena
  - Pensión completa
  - Cóctel
  - Coffee break
  - Otros
- Salones / salas (multi‑selección)
- Estado:
  - Borrador
  - Confirmado
  - Cerrado
  - Cancelado
- Notas internas

---

## 3. Salones y salas
- Cada hotel tiene sus **propias salas**
- No todos los hoteles comparten la misma estructura
- Las salas pueden:
  - Usarse de forma independiente
  - Unirse para un mismo evento

### Regla clave
Un **evento es único**, aunque use varias salas.  
Nunca se duplican eventos por sala.

---

## 4. Modelo de datos (resumen)

### Evento
- id
- hotel_id
- nombre
- fecha_inicio
- fecha_fin
- pax
- tipo_evento
- estado
- notas

### Sala
- id
- hotel_id
- nombre
- capacidad
- unible (bool)

### EventoSala (relación)
- evento_id
- sala_id

---

## 5. Importación de eventos por Excel

### Objetivo
- Importar eventos masivamente
- Evitar duplicados
- Validar datos antes de crear eventos

### Columnas recomendadas
- hotel
- nombre_evento
- fecha
- hora_inicio
- hora_fin
- pax
- tipo_evento
- salas (separadas por ;)
- referencia_externa (opcional)
- menu_cerrado (opcional)

### Reglas anti‑duplicado
- Si existe referencia_externa + hotel → actualizar
- Si no:
  - Validar por hotel + fecha + hora + nombre

---

## 6. Menús en eventos

### A) Menús cerrados (configurados en la app)
- Selección directa desde catálogo
- Estructura ya definida (recetas y productos)

### B) Menús a petición
- Subida de PDF o imagen
- Extracción de información (OCR / parseo)
- Revisión manual antes de confirmar

---

## 7. Tipos de servicio dentro del evento
Un evento puede tener **varios servicios**:
- Coffee break
- Cóctel
- Comida
- Cena
- Pensión completa

Cada servicio puede:
- Tener horario propio
- Tener su propio menú
- Usar el mismo número de pax u otro distinto

---

## 8. Integración automática

### Producción
- Si el menú contiene **recetas**
- Se generan elaboraciones escaladas por pax

### Compras
- Si el menú contiene **productos**
- Se genera lista de compra con proveedor asociado

### Inventario
- Se comprueba stock disponible
- Resultado:
  - OK
  - Stock justo
  - Faltante

### Regla clave
Cualquier cambio en:
- pax
- menú
- servicios  
provoca una **revisión automática** de producción y compras.

---

## 9. Panel de detalle de evento (UI)

### Pestañas
1. Datos
2. Menús
3. Producción
4. Compras
5. Inventario

---

## 10. Alcance MVP recomendado

### MVP 1
- Calendario mensual / semanal
- Alta y edición manual
- Salas por hotel
- Evento único con múltiples salas

### MVP 2
- Importación Excel
- Menús cerrados
- Generación de producción y compras

### MVP 3
- Menús por documento (OCR)
- Servicios múltiples por evento
- Control avanzado de inventario

---

## Nota final
Este módulo es **núcleo operativo** del sistema.  
El dashboard solo consumirá información de Eventos, nunca la modificará directamente.
