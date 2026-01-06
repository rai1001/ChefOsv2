-- Solución para el usuario paypalpago1978@gmail.com
-- El usuario existe en auth.users pero no tiene perfil en profiles

-- Paso 1: Verificar si el usuario existe en auth.users (solo para referencia)
-- Este query NO se puede ejecutar con anon key, solo con service_role

-- Paso 2: Crear o actualizar el perfil del usuario
-- Necesitamos obtener el ID del usuario desde auth.users

-- OPCIÓN A: Si conoces el UUID del usuario de auth.users
-- Reemplaza 'USER_UUID_AQUI' con el ID real del usuario

INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  active_outlet_id,
  allowed_outlet_ids,
  is_active
)
VALUES (
  'USER_UUID_AQUI',  -- ⚠️ REEMPLAZAR con el UUID del usuario de auth.users
  'paypalpago1978@gmail.com',
  'Usuario Hotel Atlántico',
  'admin',  -- o 'manager' o 'staff' según corresponda
  '2978dfe6-efc7-4c92-ac6a-565b8a9830b0',  -- ID del Hotel Atlántico
  ARRAY['2978dfe6-efc7-4c92-ac6a-565b8a9830b0']::uuid[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  active_outlet_id = EXCLUDED.active_outlet_id,
  allowed_outlet_ids = EXCLUDED.allowed_outlet_ids,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;


-- OPCIÓN B: Crear un trigger o función que sincronice automáticamente
-- (Esto requiere permisos de service_role)

-- Verificar el resultado
SELECT
  id,
  email,
  full_name,
  role,
  is_active,
  active_outlet_id,
  allowed_outlet_ids
FROM profiles
WHERE email = 'paypalpago1978@gmail.com';
