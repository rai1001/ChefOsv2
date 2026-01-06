-- Diagnóstico completo del usuario paypalpago1978@gmail.com
-- Este query verifica el perfil, outlets y datos asociados

-- 1. Verificar perfil del usuario
SELECT
  'PERFIL USUARIO' as seccion,
  id,
  email,
  full_name,
  role,
  is_active,
  active_outlet_id,
  allowed_outlet_ids,
  created_at
FROM profiles
WHERE email = 'paypalpago1978@gmail.com';

-- 2. Ver todos los outlets disponibles
SELECT
  'OUTLETS DISPONIBLES' as seccion,
  id,
  name,
  type,
  is_active,
  address
FROM outlets
ORDER BY name;

-- 3. Buscar "Hotel Atlántico" específicamente
SELECT
  'HOTEL ATLANTICO' as seccion,
  id,
  name,
  type,
  is_active,
  address,
  created_at
FROM outlets
WHERE name ILIKE '%atlantico%' OR name ILIKE '%atlántico%';

-- 4. Contar empleados por outlet
SELECT
  'EMPLEADOS POR OUTLET' as seccion,
  o.name as outlet_name,
  COUNT(e.id) as total_empleados
FROM outlets o
LEFT JOIN employees e ON e.outlet_id = o.id
GROUP BY o.id, o.name
ORDER BY total_empleados DESC;

-- 5. Contar ingredientes por outlet
SELECT
  'INGREDIENTES POR OUTLET' as seccion,
  o.name as outlet_name,
  COUNT(i.id) as total_ingredientes
FROM outlets o
LEFT JOIN ingredients i ON i.outlet_id = o.id
GROUP BY o.id, o.name
ORDER BY total_ingredientes DESC;
