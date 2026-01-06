-- Ver todos los usuarios del sistema
-- Para ejecutar: Ctrl+Shift+P → "Supabase: Run Query"

SELECT
  id,
  email,
  full_name,
  role,
  is_active,
  active_outlet_id,
  allowed_outlet_ids,
  created_at,
  updated_at
FROM profiles
ORDER BY created_at DESC;
