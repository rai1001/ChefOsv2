-- PASO 2: Crear perfil para paypalpago1978@gmail.com
--
-- INSTRUCCIONES:
-- 1. REEMPLAZA 'USER_UUID_AQUI' en la línea 22 con el UUID del Paso 1
-- 2. Presiona Ctrl+Shift+P
-- 3. Escribe "Supabase: Run Query"
-- 4. Si dice "1 row affected" = ¡ÉXITO!
-- 5. Ve al Paso 3 para verificar

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
  'USER_UUID_AQUI',  -- ⚠️ REEMPLAZAR con el UUID del Paso 1
  'paypalpago1978@gmail.com',
  'Administrador Hotel Atlántico',
  'admin',
  '2978dfe6-efc7-4c92-ac6a-565b8a9830b0',
  ARRAY['2978dfe6-efc7-4c92-ac6a-565b8a9830b0']::uuid[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  active_outlet_id = EXCLUDED.active_outlet_id,
  allowed_outlet_ids = EXCLUDED.allowed_outlet_ids,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  full_name = EXCLUDED.full_name;
