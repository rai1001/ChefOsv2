-- Verificar acceso de usuarios a outlets
-- Reemplaza 'USER_EMAIL' con el email del usuario que quieres verificar

SELECT
  p.email,
  p.full_name,
  p.role,
  p.is_active,
  o.name as active_outlet_name,
  p.allowed_outlet_ids,
  (
    SELECT array_agg(outlets.name)
    FROM outlets
    WHERE outlets.id = ANY(p.allowed_outlet_ids)
  ) as allowed_outlet_names
FROM profiles p
LEFT JOIN outlets o ON p.active_outlet_id = o.id
WHERE p.email = 'USER_EMAIL';  -- Cambia esto por el email que quieras verificar
