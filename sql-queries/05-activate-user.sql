-- Activar un usuario y asignarle outlets
-- IMPORTANTE: Reemplaza los valores antes de ejecutar

UPDATE profiles
SET
  is_active = true,
  role = 'staff',  -- Opciones: 'admin', 'manager', 'staff'
  active_outlet_id = 'OUTLET_ID_AQUI',  -- ID del outlet activo
  allowed_outlet_ids = ARRAY['OUTLET_ID_AQUI']::uuid[]  -- Array de IDs permitidos
WHERE email = 'USER_EMAIL_AQUI';

-- Verificar el cambio
SELECT
  email,
  full_name,
  role,
  is_active,
  active_outlet_id,
  allowed_outlet_ids
FROM profiles
WHERE email = 'USER_EMAIL_AQUI';
