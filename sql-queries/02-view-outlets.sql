-- Ver todos los outlets (cocinas/establecimientos)
-- Para ejecutar: Ctrl+Shift+P → "Supabase: Run Query"

SELECT
  id,
  name,
  type,
  is_active,
  address,
  settings,
  created_at
FROM outlets
ORDER BY name;
