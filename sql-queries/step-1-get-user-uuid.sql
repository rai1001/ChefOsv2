-- PASO 1: Obtener UUID del usuario paypalpago1978@gmail.com
--
-- INSTRUCCIONES:
-- 1. Abre este archivo en VS Code
-- 2. Presiona Ctrl+Shift+P
-- 3. Escribe "Supabase: Run Query"
-- 4. Copia el UUID que aparezca en los resultados
-- 5. Ve al archivo "step-2-create-profile.sql" y reemplaza USER_UUID_AQUI

SELECT
  id as user_uuid,
  email,
  created_at,
  confirmed_at,
  '⚠️ COPIA ESTE UUID Y ÚSALO EN EL PASO 2' as instruccion
FROM auth.users
WHERE email = 'paypalpago1978@gmail.com';

-- Si NO aparece ningún resultado, el usuario NO existe en auth.users
-- En ese caso, ve al archivo "step-0-create-auth-user.sql"
