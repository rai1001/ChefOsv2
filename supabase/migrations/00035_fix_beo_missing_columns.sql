-- ============================================================================
-- Fix get_event_beo (00018) — añade columnas referenciadas pero nunca creadas
--
-- Issue: 00018_m1_beo.sql RPC `get_event_beo` referencia:
--   - r.unit_cost          (recipes)         → no existe
--   - r.yield_pct          (recipes)         → no existe
--   - ms.course_type       (menu_sections)   → no existe
--   - es.setup_style       (event_spaces)    → no existe (la columna es setup_type)
--
-- Cualquier llamada a get_event_beo() falla con "column does not exist".
-- Frontend BEO (src/features/commercial/types/index.ts:148-181) las espera tipadas.
--
-- Fix: añadir las 4 columnas como nullable. setup_style se mantiene independiente
-- de setup_type (este último era texto libre tipo "U-shape", aquel sirve para
-- estilos predefinidos de presentación). Para mantener compatibilidad, no se
-- altera setup_type ni se hace alias.
-- ============================================================================

-- 1. recipes.unit_cost (coste por unidad de receta — distinto de cost_per_serving
--    que es por servicio. unit_cost = coste para "1 unidad" entendida como racional
--    de salida. Hoy redundante pero el RPC y el frontend lo esperan).
alter table public.recipes
  add column if not exists unit_cost numeric(12,4);

-- 2. recipes.yield_pct (porcentaje de rendimiento real — qué fracción de la
--    receta termina servida tras pérdidas de cocción/manipulación).
alter table public.recipes
  add column if not exists yield_pct numeric(5,2);

-- 3. menu_sections.course_type (tipo de pase/curso — "entrante", "principal",
--    "postre", "guarnición"...).
alter table public.menu_sections
  add column if not exists course_type text;

-- 4. event_spaces.setup_style (estilo de montaje — "imperial", "cabaret",
--    "teatro"...).
alter table public.event_spaces
  add column if not exists setup_style text;

-- ============================================================================
-- Backfill mínimo para datos existentes: si recipes.cost_per_serving > 0,
-- copiar a unit_cost para que BEOs existentes muestren el coste sin null.
-- yield_pct queda null hasta input manual.
-- ============================================================================

update public.recipes
set unit_cost = cost_per_serving
where unit_cost is null and cost_per_serving > 0;
