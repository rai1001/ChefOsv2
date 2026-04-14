# Sugerencias – Módulo Producción (ChefOS)

Este documento recoge mejoras recomendadas para el **Módulo Producción**, priorizadas por impacto real en operación (hoteles/restauración) y con propuesta de fase (MVP 1/2/3).

---

## 1) Separar “tareas” de “elaboraciones”
**Problema:** mezclar tareas operativas con elaboraciones (recetas) complica compras/inventario.

**Propuesta:**
Mantener un campo `tipo_tarea` (ya previsto) con opciones:
- **elaboración/receta** (tiene receta, cantidades, rendimiento)
- **operativa** (limpieza, orden, mise en place general)
- **control** (verificación/firmas: etiquetado, temperatura, cierre)

**Beneficio:**
- Solo las elaboraciones impactan en compras/inventario.
- Las tareas operativas no contaminan cálculos.

**Fase recomendada:** MVP 1 (tal como está, solo asegurarlo como estándar).

---

## 2) Checklists inteligentes (alto valor, bajo esfuerzo)
**Casos típicos:**
- “Cierre de cocina”
- “Revisar etiquetado”
- “Apertura turno mañana”

**Propuesta:**
- Añadir subtareas tipo checklist (checkbox) a una tarea.
- Ejemplo “Revisar etiquetado”:
  - [ ] Etiquetas con fecha
  - [ ] Etiquetas legibles
  - [ ] Productos sin caducar

**Beneficio:** mejora ejecución real, reduce olvidos, ayuda a auditorías.

**Fase:** MVP 2 (o MVP 1 si se quiere muy simple).

---

## 3) Asignación por rol (sin persona)
**Problema:** a veces no se sabe quién estará, pero sí el puesto.

**Propuesta:**
Permitir asignación a:
- persona
- turno
- **rol/puesto** (p.ej. “partida caliente”, “ayudante”)

**Beneficio:** planificación flexible y realista.

**Fase:** MVP 3.

---

## 4) Dependencias y bloqueos simples
**Ejemplo real:**
- “Envasar salsa” no puede iniciar hasta “Reducir fondo”.

**Propuesta:**
- Campo `bloqueada_por_tarea_id` (dependencia simple).
- UI: indicador “Bloqueada” + motivo.

**Beneficio:** evita errores de secuencia y retrabajo.

**Fase:** MVP 3.

---

## 5) Reglas anti-abuso en móvil (protege el sistema)
**Problema:** marcar terminado sin hacerlo desvirtúa datos.

**Propuesta mínima:**
- No permitir “Terminado” sin pasar por “En proceso”.
- Registrar timestamps:
  - hora inicio
  - hora fin
- (Opcional) pedir comentario si se termina “demasiado rápido”.

**Beneficio:** datos fiables y control sin fricción.

**Fase:** MVP 1.

---

## 6) Alertas automáticas (sin dashboard)
**Ejemplo:**
- “Elaboración base salsa aún no iniciada – evento hoy 20:30”.

**Propuesta:**
- Alertas al jefe cuando:
  - tarea crítica no inicia antes de cierta hora
  - tarea bloqueada demasiado tiempo
  - tarea pendiente cerca del deadline

**Beneficio:** anticipación y menos incendios.

**Fase:** MVP 2.

---

## 7) Cierre de turno / cierre de día
**Problema:** tareas “fantasma” que nadie retoma.

**Propuesta:**
Acción “Cerrar turno”:
- lista tareas pendientes
- opciones:
  - mover a siguiente turno
  - reasignar
  - marcar como no realizada (con motivo)

**Beneficio:** continuidad operativa.

**Fase:** MVP 2.

---

## 8) Historial y trazabilidad (simple pero imprescindible)
Guardar:
- quién crea la tarea
- quién la ejecuta
- cuándo inicia/termina
- re-aperturas y cambios

**Beneficio:** auditoría, métricas reales, mejora continua.

**Fase:** MVP 1 (básico).

---

## 9) UX móvil: 1 pantalla principal (sin ruido)
**Principio:** el personal no debe navegar.

**Propuesta:**
Pantalla “Hoy / Mi semana”:
- tareas del turno
- orden:
  1) críticas primero
  2) por hora objetivo
- botones grandes:
  - ▶️ Iniciar
  - ✅ Terminar

**Fase:** MVP 1.

---

## 10) Resumen de prioridades
### Mantener (ya bien definido)
- Doble vista: jefe vs personal
- Tareas manuales y repetitivas
- Estados simples

### Añadir pronto
- Checklists
- Reglas de estados y timestamps
- Historial básico
- Cierre de turno

### Añadir más adelante
- Dependencias
- Asignación por rol
- Alertas avanzadas

---

## Nota final
Estas sugerencias buscan que Producción sea:
- **simple y usable** para el personal en móvil
- **potente y controlable** para el jefe de cocina
sin mezclar responsabilidades con Horarios ni forzar que todo venga de Eventos.
