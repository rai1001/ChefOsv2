# 🚨 Solución: Usuario paypalpago1978@gmail.com no puede acceder

## 📊 Diagnóstico Completado

### ✅ Estado Actual

**Hotel Atlántico (Outlet):**

- ✅ **Existe** en la base de datos
- ✅ ID: `2978dfe6-efc7-4c92-ac6a-565b8a9830b0`
- ✅ Nombre: "Atlantico"
- ✅ Estado: Activo
- ✅ Tiene **4 empleados** importados
- ✅ Tiene **1000 ingredientes** importados

**Usuario paypalpago1978@gmail.com:**

- ❌ **NO tiene perfil** en la tabla `profiles`
- ⚠️ Puede que exista en `auth.users` pero falta la entrada en `profiles`
- 🚫 **PROBLEMA**: Sin perfil no puede iniciar sesión

### 🔍 Causa del Problema

En ChefOS, cuando un usuario se registra, se crean **DOS entradas**:

1. **`auth.users`** - Sistema de autenticación de Supabase
2. **`profiles`** - Tabla de perfiles de tu aplicación (contiene outlet_id, role, etc.)

El problema es que el usuario solo tiene entrada en `auth.users` pero **NO en `profiles`**, por lo que aunque pueda autenticarse, la aplicación no lo reconoce porque falta su perfil.

## 🛠️ Solución (Opción Rápida - 5 minutos)

### Paso 1: Accede al Dashboard de Supabase

1. Ve a: https://app.supabase.com/project/xrgewhvijmrthsnrrxdw
2. Inicia sesión con tu cuenta de Supabase
3. Asegúrate de estar en el proyecto correcto (`xrgewhvijmrthsnrrxdw`)

### Paso 2: Abre el SQL Editor

1. En el menú lateral izquierdo, busca el ícono de **"SQL Editor"** (parece un documento con código)
2. Click en **"SQL Editor"**
3. Click en **"New Query"**

### Paso 3: Obtén el UUID del Usuario

Copia y pega este SQL:

```sql
SELECT
  id,
  email,
  created_at,
  confirmed_at
FROM auth.users
WHERE email = 'paypalpago1978@gmail.com';
```

Click en **"Run"** (o presiona `Ctrl+Enter`)

**Resultado esperado:**

- Si ves el usuario → Copia el `id` (es un UUID largo como `123e4567-e89b-12d3-a456-426614174000`)
- Si NO ves nada → El usuario nunca se registró, ve a la **Opción Alternativa** abajo

### Paso 4: Crear el Perfil

Copia este SQL y **REEMPLAZA** `'USER_UUID_AQUI'` con el UUID que copiaste:

```sql
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
  'USER_UUID_AQUI',  -- ⚠️ REEMPLAZAR con el UUID del Paso 3
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
  is_active = EXCLUDED.is_active;
```

Click en **"Run"**

### Paso 5: Verificar

Ejecuta este SQL para confirmar:

```sql
SELECT
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.is_active,
  o.name as outlet_name,
  p.allowed_outlet_ids
FROM profiles p
LEFT JOIN outlets o ON o.id = p.active_outlet_id
WHERE p.email = 'paypalpago1978@gmail.com';
```

Deberías ver:

- ✅ email: paypalpago1978@gmail.com
- ✅ role: admin
- ✅ is_active: true
- ✅ outlet_name: Atlantico

## 🎯 Prueba Final

1. Abre la aplicación ChefOS
2. Inicia sesión con: `paypalpago1978@gmail.com`
3. Deberías ver el **Hotel Atlántico** disponible
4. Deberías poder acceder a todos los datos (empleados, ingredientes)

## 🔄 Opción Alternativa: Si el usuario NO existe en auth.users

Si el Paso 3 no devolvió resultados, el usuario nunca se registró. Hay dos opciones:

### Opción A: Invitar al Usuario (RECOMENDADO)

1. Ve a: https://app.supabase.com/project/xrgewhvijmrthsnrrxdw/auth/users
2. Click en **"Invite User"**
3. Ingresa el email: `paypalpago1978@gmail.com`
4. Se enviará un email de invitación
5. Cuando el usuario acepte, se creará automáticamente en `auth.users`
6. Luego ejecuta los Pasos 3-5 de arriba

### Opción B: Crear Usuario Manualmente

1. Ve a: https://app.supabase.com/project/xrgewhvijmrthsnrrxdw/auth/users
2. Click en **"Add User"** (no "Invite")
3. Ingresa:
   - Email: `paypalpago1978@gmail.com`
   - Password: (establece una contraseña temporal)
   - Auto Confirm User: ✅ (marca el checkbox)
4. Click en **"Create User"**
5. Ejecuta los Pasos 3-5 de arriba

## 📝 Archivos Útiles Creados

He creado estos archivos para ayudarte:

1. **[sql-queries/URGENT-fix-paypalpago-user.sql](sql-queries/URGENT-fix-paypalpago-user.sql)**
   - Contiene todos los SQL necesarios
   - Instrucciones paso a paso
   - Puedes ejecutarlo directamente desde el SQL Editor

2. **[packages/web/scripts/check-user.mjs](packages/web/scripts/check-user.mjs)**
   - Script de diagnóstico
   - Ejecutar con: `cd packages/web && node scripts/check-user.mjs`
   - Verifica estado actual del usuario y outlets

3. **[packages/web/scripts/fix-user-profile.mjs](packages/web/scripts/fix-user-profile.mjs)**
   - Script para intentar fix automático
   - Ejecutar con: `cd packages/web && node scripts/fix-user-profile.mjs`

## ❓ Preguntas Frecuentes

**P: ¿Por qué pasó esto?**
R: Probablemente el usuario se registró directamente (no vía invitación) y el trigger que crea el perfil automáticamente no se ejecutó o no está configurado.

**P: ¿Cómo evito que pase de nuevo?**
R: Asegúrate de que existe un trigger en Supabase que crea automáticamente el perfil cuando se crea un usuario en auth.users. O usa el sistema de invitaciones.

**P: ¿El usuario perderá los datos del Hotel Atlántico?**
R: No. Los empleados e ingredientes ya están asociados al Hotel Atlántico mediante el `outlet_id`. Solo estás vinculando al usuario con ese outlet.

**P: ¿Qué pasa si ejecuto el SQL dos veces?**
R: No hay problema. El query usa `ON CONFLICT DO UPDATE`, así que simplemente actualizará los datos si ya existe.

## 🆘 Si Necesitas Ayuda

1. Revisa el archivo SQL: [sql-queries/URGENT-fix-paypalpago-user.sql](sql-queries/URGENT-fix-paypalpago-user.sql)
2. Ejecuta el diagnóstico: `cd packages/web && node scripts/check-user.mjs`
3. Verifica en Supabase Dashboard → Auth → Users que el usuario existe

---

**Tiempo estimado:** 5-10 minutos
**Dificultad:** Baja (solo copiar/pegar SQL)
**Requiere:** Acceso al Dashboard de Supabase
