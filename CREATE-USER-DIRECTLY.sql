-- ============================================================================
-- SOLUCIÓN DIRECTA: Crear usuario paypalpago1978@gmail.com
-- ============================================================================
--
-- ESTE ARCHIVO CONTIENE LA SOLUCIÓN COMPLETA
--
-- IMPORTANTE: Debes ejecutar esto desde el SQL Editor de Supabase Dashboard
-- NO desde VS Code porque requiere permisos de service_role
--
-- URL: https://app.supabase.com/project/xrgewhvijmrthsnrrxdw/sql
-- ============================================================================

-- OPCIÓN 1: Si el usuario YA existe en auth.users pero no tiene perfil
-- (Primero ejecuta esto para ver si existe)
SELECT id, email, created_at FROM auth.users WHERE email = 'paypalpago1978@gmail.com';

-- Si el query anterior devuelve un resultado, COPIA el ID y úsalo en este INSERT:
-- (Reemplaza '00000000-0000-0000-0000-000000000000' con el ID real)

INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  active_outlet_id,
  allowed_outlet_ids,
  is_active,
  created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',  -- ⚠️ REEMPLAZAR con el ID de auth.users
  'paypalpago1978@gmail.com',
  'Administrador Hotel Atlántico',
  'admin',
  '2978dfe6-efc7-4c92-ac6a-565b8a9830b0',
  ARRAY['2978dfe6-efc7-4c92-ac6a-565b8a9830b0']::uuid[],
  true,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  active_outlet_id = EXCLUDED.active_outlet_id,
  allowed_outlet_ids = EXCLUDED.allowed_outlet_ids,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  full_name = EXCLUDED.full_name;


-- ============================================================================
-- OPCIÓN 2: Si el usuario NO existe en auth.users
-- ============================================================================
-- Entonces debes crearlo primero desde la interfaz:
-- 1. Ve a: https://app.supabase.com/project/xrgewhvijmrthsnrrxdw/auth/users
-- 2. Click "Add User"
-- 3. Ingresa:
--    Email: paypalpago1978@gmail.com
--    Password: ChefOS2024! (o la que prefieras)
--    ✅ Auto Confirm User
-- 4. Click "Add user"
-- 5. Espera unos segundos
-- 6. Ejecuta OPCIÓN 1 de arriba


-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Ejecuta esto para verificar que todo funcionó:

SELECT
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.is_active,
  p.active_outlet_id,
  o.name as outlet_name,
  p.allowed_outlet_ids,
  p.created_at
FROM profiles p
LEFT JOIN outlets o ON o.id = p.active_outlet_id
WHERE p.email = 'paypalpago1978@gmail.com';

-- Deberías ver:
-- ✅ email: paypalpago1978@gmail.com
-- ✅ role: admin
-- ✅ is_active: true
-- ✅ outlet_name: Atlantico
-- ✅ active_outlet_id: 2978dfe6-efc7-4c92-ac6a-565b8a9830b0
