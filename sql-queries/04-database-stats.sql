-- Estadísticas generales de la base de datos

SELECT
  'Usuarios Totales' as metric,
  COUNT(*)::text as value
FROM profiles

UNION ALL

SELECT
  'Usuarios Activos' as metric,
  COUNT(*)::text as value
FROM profiles
WHERE is_active = true

UNION ALL

SELECT
  'Outlets Totales' as metric,
  COUNT(*)::text as value
FROM outlets

UNION ALL

SELECT
  'Outlets Activos' as metric,
  COUNT(*)::text as value
FROM outlets
WHERE is_active = true

UNION ALL

SELECT
  'Ingredientes' as metric,
  COUNT(*)::text as value
FROM ingredients

UNION ALL

SELECT
  'Recetas' as metric,
  COUNT(*)::text as value
FROM fichas_tecnicas

UNION ALL

SELECT
  'Eventos' as metric,
  COUNT(*)::text as value
FROM events

UNION ALL

SELECT
  'Empleados' as metric,
  COUNT(*)::text as value
FROM employees;
