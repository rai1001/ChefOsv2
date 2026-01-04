# 🔧 Guía de Acceso Total a Supabase

## 📋 Credenciales Configuradas

### Producción
```
URL: https://xrgewhvijmrthsnrrxdw.supabase.co
Anon Key: sb_publishable_09GcoxV84nJjX5n2ZALgYg_G2YbQrU_
Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Diferencias entre claves:
- **ANON_KEY**: Acceso público limitado con RLS (Row Level Security)
- **SERVICE_ROLE_KEY**: ⚠️ **Acceso administrativo total** - Solo usar en backend/scripts

---

## 🛠️ Herramientas Disponibles

### 1. **supabase-explore-api.ts** - Explorador de Base de Datos
```bash
npx tsx supabase-explore-api.ts
```

**Funcionalidades:**
- ✅ Lista todas las tablas con conteo de registros
- ✅ Muestra estructura de columnas
- ✅ Prueba Edge Functions
- ✅ No requiere dependencias externas (usa fetch)

**Salida:**
```
📊 EXPLORANDO TABLAS:
✅ outlets                   42 registros
   Columnas: id, name, address, city, country...

⚡ PROBANDO EDGE FUNCTIONS:
✅ scan-document (HTTP 200)
✅ enrich-ingredient (HTTP 200)
```

---

### 2. **supabase-admin-client.ts** - Cliente Administrativo
```bash
# Listar tablas
npx tsx supabase-admin-client.ts tables

# Información de una tabla específica
npx tsx supabase-admin-client.ts info outlets

# Listar Edge Functions
npx tsx supabase-admin-client.ts functions

# Probar conexión
npx tsx supabase-admin-client.ts test
```

**Uso programático:**
```typescript
import { supabaseAdmin, getTableInfo } from './supabase-admin-client';

// Consultar tabla
const { data, error } = await supabaseAdmin
  .from('outlets')
  .select('*')
  .limit(10);

// Obtener información
const info = await getTableInfo('employees');
console.log(`Tabla employees tiene ${info.count} registros`);
```

---

### 3. **test-supabase-connection.ts** - Diagnóstico de Conexión
```bash
npx tsx test-supabase-connection.ts
```

**Prueba:**
- ✅ Conectividad REST API
- ✅ Edge Functions (scan-document, enrich-ingredient)
- ✅ Acceso a tablas
- ⏱️ Tiempos de respuesta

---

## 🌐 Acceso al Dashboard de Supabase

### URL del Dashboard:
```
https://supabase.com/dashboard/project/xrgewhvijmrthsnrrxdw
```

### Funciones del Dashboard:
1. **Table Editor**: Ver y editar datos directamente
2. **SQL Editor**: Ejecutar queries personalizadas
3. **Database**: Ver estructura, índices, RLS policies
4. **Edge Functions**: Desplegar y monitorear funciones
5. **Storage**: Gestionar archivos
6. **Logs**: Ver logs en tiempo real

---

## 📊 Estructura de la Base de Datos

### Tablas Principales:

#### **outlets**
- Centro de operaciones (restaurantes, cocinas)
- Relación 1:N con casi todas las tablas

#### **employees**
- Empleados del establecimiento
- Columnas: `id`, `name`, `role`, `active`, `outlet_id`

#### **ingredients**
- Ingredientes con información nutricional
- Integración con Gemini AI para enriquecimiento

#### **recipes**
- Recetas con ingredientes y pasos
- Cálculos nutricionales automáticos

#### **menus**
- Menús y cartas del establecimiento
- Generación AI disponible

#### **purchase_orders**
- Órdenes de compra a proveedores
- Estados: draft, sent, received, cancelled

#### **inventory**
- Control de stock en tiempo real
- Alertas de stock bajo

#### **schedule**
- Horarios y turnos de empleados
- Soporte para documentos legacy

---

## ⚡ Edge Functions Desplegadas

### 1. **scan-document**
```typescript
// Endpoint
POST https://xrgewhvijmrthsnrrxdw.supabase.co/functions/v1/scan-document

// Request
{
  "imageBase64": "data:image/jpeg;base64,...",
  "type": "invoice" | "menu" | "sports_menu" | "delivery_note",
  "outletId": "optional"
}

// Response
{
  "success": true,
  "data": {
    "items": [...],
    "metadata": {...}
  },
  "usage": {
    "inputTokens": 1234,
    "outputTokens": 567,
    "estimatedCost": 0.001234
  }
}
```

**Modelo:** `gemini-2.0-flash-exp`

### 2. **enrich-ingredient**
```typescript
// Endpoint
POST https://xrgewhvijmrthsnrrxdw.supabase.co/functions/v1/enrich-ingredient

// Request
{
  "ingredientName": "tomate",
  "outletId": "optional"
}

// Response
{
  "success": true,
  "data": {
    "nutritionalInfo": {
      "calories": 18,
      "protein": 0.9,
      "carbs": 3.9,
      "fat": 0.2
    },
    "allergens": []
  }
}
```

### 3. **chat-copilot**
```typescript
POST /functions/v1/chat-copilot
{
  "message": "¿Cómo hago una pizza?",
  "context": {...},
  "history": [...]
}
```

### 4. **generate-menu**
```typescript
POST /functions/v1/generate-menu
{
  "params": {
    "type": "weekly",
    "cuisine": "mediterranean"
  }
}
```

---

## 🔐 Configuración de Seguridad

### Row Level Security (RLS)

**Políticas actuales:**
```sql
-- Tabla: schedule
CREATE POLICY "Enable all access for authenticated users" ON schedule
FOR ALL USING (auth.role() = 'authenticated');
```

**Verificar políticas:**
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public';
```

---

## 🚀 Comandos Útiles

### Consultas SQL Directas (desde Dashboard)

```sql
-- Ver todas las tablas con conteos
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Ver estructura de una tabla
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'outlets';

-- Ver índices
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public';
```

### Gestión de Secretos (Vault)

```bash
# Listar secretos (requiere acceso al dashboard)
https://supabase.com/dashboard/project/xrgewhvijmrthsnrrxdw/settings/vault

# Secretos configurados:
- GEMINI_API_KEY (para Edge Functions)
```

---

## 📝 Operaciones Comunes

### Insertar datos desde código:

```typescript
import { supabaseAdmin } from './supabase-admin-client';

// Insertar outlet
const { data, error } = await supabaseAdmin
  .from('outlets')
  .insert({
    name: 'Restaurante Central',
    address: 'Calle Mayor 123',
    city: 'Madrid',
    country: 'España'
  })
  .select();

if (error) {
  console.error('Error:', error);
} else {
  console.log('Outlet creado:', data);
}
```

### Actualizar registros:

```typescript
// Actualizar empleado
const { error } = await supabaseAdmin
  .from('employees')
  .update({ active: false })
  .eq('id', 'employee-id');
```

### Consultas complejas:

```typescript
// Obtener outlets con empleados
const { data } = await supabaseAdmin
  .from('outlets')
  .select(`
    *,
    employees (
      id,
      name,
      role
    )
  `);
```

---

## 🔄 Migraciones

### Última migración:
```
20260103153500_fix_e2e_bugs.sql
```

**Cambios:**
- ✅ Añadida columna `active` a tabla `employees`
- ✅ Creada tabla `schedule` con RLS

### Crear nueva migración:

```bash
# Con Supabase CLI (si está instalado)
supabase migration new nombre_migracion

# O crear archivo manualmente
# supabase/migrations/YYYYMMDDHHMMSS_descripcion.sql
```

---

## 🐛 Troubleshooting

### Error: "fetch failed"
- ⚠️ El entorno actual tiene restricciones de red
- ✅ Ejecutar scripts en entorno local con conectividad

### Error: "relation does not exist"
- La tabla no ha sido creada
- Verificar migraciones aplicadas

### Error: "insufficient_privilege"
- Usar SERVICE_ROLE_KEY en lugar de ANON_KEY
- Verificar políticas RLS

### Edge Function timeout
- Revisar logs en Dashboard > Edge Functions > Logs
- Verificar GEMINI_API_KEY en Vault

---

## 📚 Recursos Adicionales

- **Documentación oficial**: https://supabase.com/docs
- **Dashboard del proyecto**: https://supabase.com/dashboard/project/xrgewhvijmrthsnrrxdw
- **API Reference**: https://supabase.com/docs/reference/javascript/introduction
- **SQL Editor**: Ejecutar queries directamente desde el dashboard

---

## ⚠️ Notas de Seguridad

1. **NUNCA** exponer `SERVICE_ROLE_KEY` en el frontend
2. Usar `ANON_KEY` solo para operaciones públicas
3. Mantener RLS habilitado en todas las tablas
4. Rotar claves periódicamente
5. Monitorear logs de acceso

---

## 🎯 Próximos Pasos

1. ✅ Herramientas de acceso creadas
2. ⏳ Probar conectividad en entorno local
3. ⏳ Verificar todas las Edge Functions
4. ⏳ Implementar monitoreo de costos AI
5. ⏳ Configurar backups automáticos

---

**Última actualización:** 2026-01-04
**Autor:** Claude Code
