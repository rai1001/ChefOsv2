-- RESETEAR CONTRASEÑA DEL USUARIO
--
-- IMPORTANTE: Ejecuta esto desde el SQL Editor de Supabase Dashboard
-- URL: https://app.supabase.com/project/xrgewhvijmrthsnrrxdw/sql
--
-- Este script resetea la contraseña del usuario para poder iniciar sesión

-- Opción 1: Resetear contraseña directamente (requiere service_role)
-- UPDATE auth.users
-- SET encrypted_password = crypt('ChefOS2024!', gen_salt('bf'))
-- WHERE email = 'paypalpago1978@gmail.com';

-- Opción 2: Usar el Dashboard (RECOMENDADO)
-- 1. Ve a: https://app.supabase.com/project/xrgewhvijmrthsnrrxdw/auth/users
-- 2. Busca el usuario: paypalpago1978@gmail.com
-- 3. Click en el menú de 3 puntos (...)
-- 4. Click en "Reset Password"
-- 5. Se enviará un email de reset (o puedes establecer una nueva contraseña directamente)

-- Opción 3: Establecer contraseña desde la UI de Supabase
-- 1. Ve a: https://app.supabase.com/project/xrgewhvijmrthsnrrxdw/auth/users
-- 2. Busca el usuario: paypalpago1978@gmail.com
-- 3. Click en el usuario
-- 4. En la sección "User", click en "Send password reset email"
-- O directamente establece una nueva contraseña temporal

-- Verificar que el usuario existe y está confirmado
SELECT
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  CASE
    WHEN email_confirmed_at IS NULL THEN '❌ Email NO confirmado'
    ELSE '✅ Email confirmado'
  END as estado_confirmacion
FROM auth.users
WHERE email = 'paypalpago1978@gmail.com';

-- Si el email NO está confirmado, confirmar el usuario:
-- UPDATE auth.users
-- SET email_confirmed_at = now(),
--     confirmed_at = now()
-- WHERE email = 'paypalpago1978@gmail.com';
