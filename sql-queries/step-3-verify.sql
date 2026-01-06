-- PASO 3: Verificar que el perfil se creó correctamente
--
-- INSTRUCCIONES:
-- 1. Presiona Ctrl+Shift+P
-- 2. Escribe "Supabase: Run Query"
-- 3. Verifica que aparezca:
--    ✅ email: paypalpago1978@gmail.com
--    ✅ role: admin
--    ✅ is_active: true
--    ✅ outlet_name: Atlantico
--    ✅ allowed_outlet_ids tiene el UUID del hotel

SELECT
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.is_active,
  p.active_outlet_id,
  o.name as outlet_name,
  p.allowed_outlet_ids,
  '✅ Si ves esto, el usuario ya puede iniciar sesión' as resultado
FROM profiles p
LEFT JOIN outlets o ON o.id = p.active_outlet_id
WHERE p.email = 'paypalpago1978@gmail.com';

-- Si todo está bien:
-- ✅ El usuario puede iniciar sesión
-- ✅ Verá el Hotel Atlántico disponible
-- ✅ Podrá acceder a los 4 empleados y 1000 ingredientes
