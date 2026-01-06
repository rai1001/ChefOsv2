-- ⚠️ URGENTE: Solución para paypalpago1978@gmail.com
-- El usuario no puede acceder porque no tiene perfil en la tabla profiles

-- INSTRUCCIONES:
-- 1. Ve a Supabase Dashboard: https://app.supabase.com/project/xrgewhvijmrthsnrrxdw
-- 2. Ve a SQL Editor (icono de base de datos en el menú izquierdo)
-- 3. Ejecuta PRIMERO el query de la Sección A para obtener el UUID
-- 4. Copia el UUID
-- 5. Reemplaza 'USER_UUID_AQUI' en la Sección B con el UUID copiado
-- 6. Ejecuta la Sección B

-- ═══════════════════════════════════════════════════════════════════
-- SECCIÓN A: Obtener UUID del usuario
-- ═══════════════════════════════════════════════════════════════════
-- NOTA: Este query requiere permisos de service_role
-- Ejecuta esto en el SQL Editor del Dashboard de Supabase

SELECT
  id,
  email,
  created_at,
  confirmed_at
FROM auth.users
WHERE email = 'paypalpago1978@gmail.com';

-- Si el usuario NO aparece, significa que nunca se registró
-- En ese caso, usa la "OPCIÓN ALTERNATIVA" abajo

-- ═══════════════════════════════════════════════════════════════════
-- SECCIÓN B: Crear perfil con el UUID obtenido
-- ═══════════════════════════════════════════════════════════════════
-- ⚠️ REEMPLAZA 'USER_UUID_AQUI' con el UUID de la Sección A

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
  'USER_UUID_AQUI',  -- ⚠️ REEMPLAZAR CON EL UUID DEL USUARIO
  'paypalpago1978@gmail.com',
  'Administrador Hotel Atlántico',
  'admin',
  '2978dfe6-efc7-4c92-ac6a-565b8a9830b0',  -- ID del Hotel Atlántico
  ARRAY['2978dfe6-efc7-4c92-ac6a-565b8a9830b0']::uuid[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  active_outlet_id = EXCLUDED.active_outlet_id,
  allowed_outlet_ids = EXCLUDED.allowed_outlet_ids,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  full_name = EXCLUDED.full_name;

-- ═══════════════════════════════════════════════════════════════════
-- SECCIÓN C: Verificar que funcionó
-- ═══════════════════════════════════════════════════════════════════

SELECT
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.is_active,
  p.active_outlet_id,
  o.name as outlet_name,
  p.allowed_outlet_ids
FROM profiles p
LEFT JOIN outlets o ON o.id = p.active_outlet_id
WHERE p.email = 'paypalpago1978@gmail.com';

-- Deberías ver:
-- ✅ email: paypalpago1978@gmail.com
-- ✅ role: admin
-- ✅ is_active: true
-- ✅ outlet_name: Atlantico
-- ✅ allowed_outlet_ids: {2978dfe6-efc7-4c92-ac6a-565b8a9830b0}


-- ═══════════════════════════════════════════════════════════════════
-- OPCIÓN ALTERNATIVA: Si el usuario NO existe en auth.users
-- ═══════════════════════════════════════════════════════════════════

-- Si la Sección A no devuelve resultados, el usuario NO se ha registrado nunca
-- Opciones:

-- OPCIÓN 1: Invitar al usuario (RECOMENDADO)
-- 1. Ve a: https://app.supabase.com/project/xrgewhvijmrthsnrrxdw/auth/users
-- 2. Click en "Invite User"
-- 3. Email: paypalpago1978@gmail.com
-- 4. Se le enviará un email para que establezca su contraseña
-- 5. Cuando el usuario acepte, el perfil se creará automáticamente
-- 6. Ejecuta la Sección B después para asignar el outlet

-- OPCIÓN 2: Crear usuario manualmente
-- 1. Ve a: https://app.supabase.com/project/xrgewhvijmrthsnrrxdw/auth/users
-- 2. Click en "Add user"
-- 3. Ingresa el email y establece una contraseña temporal
-- 4. Ejecuta la Sección A para obtener el UUID
-- 5. Ejecuta la Sección B con el UUID obtenido


-- ═══════════════════════════════════════════════════════════════════
-- RESUMEN DE DATOS ACTUALES
-- ═══════════════════════════════════════════════════════════════════

-- Hotel Atlántico:
--   ID: 2978dfe6-efc7-4c92-ac6a-565b8a9830b0
--   Nombre: Atlantico
--   Empleados: 4
--   Ingredientes: 1000

-- Usuario:
--   Email: paypalpago1978@gmail.com
--   Estado Actual: SIN PERFIL EN PROFILES
--   Problema: No puede iniciar sesión porque falta entrada en tabla profiles
