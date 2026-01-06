# 🎯 Guía: Solucionar Usuario con Extensión VS Code

## 📋 Preparación

1. **Asegúrate de que la extensión de Supabase esté conectada**
   - Presiona `Ctrl+Shift+P`
   - Escribe "Supabase: Connect to Project"
   - Si ya estás conectado, verás el ícono de Supabase en la barra lateral

2. **Si NO estás conectado:**
   - Ve a https://app.supabase.com/account/tokens
   - Genera un Access Token
   - Presiona `Ctrl+Shift+P` → "Supabase: Connect to Project"
   - Pega el token

## 🚀 Proceso Paso a Paso

### PASO 1: Obtener UUID del Usuario

1. Abre el archivo: **`sql-queries/step-1-get-user-uuid.sql`**
2. Presiona `Ctrl+Shift+P`
3. Escribe: **"Supabase: Run Query"**
4. Presiona `Enter`

**Resultado esperado:**

```
user_uuid                            | email                      | instruccion
-------------------------------------|----------------------------|----------------
123e4567-e89b-12d3-a456-426614174000 | paypalpago1978@gmail.com  | ⚠️ COPIA ESTE UUID...
```

5. **COPIA** el UUID (la columna `user_uuid`)

**Si NO aparece ningún resultado:**

- El usuario NO existe en `auth.users`
- Sigue las instrucciones en `step-0-create-auth-user.sql`
- Necesitarás usar el Dashboard de Supabase para crear el usuario

### PASO 2: Crear el Perfil

1. Abre el archivo: **`sql-queries/step-2-create-profile.sql`**
2. **BUSCA** la línea que dice: `'USER_UUID_AQUI'`
3. **REEMPLAZA** `USER_UUID_AQUI` con el UUID que copiaste
4. Ejemplo:

   ```sql
   -- ANTES:
   'USER_UUID_AQUI',

   -- DESPUÉS:
   '123e4567-e89b-12d3-a456-426614174000',
   ```

5. **GUARDA** el archivo (`Ctrl+S`)
6. Presiona `Ctrl+Shift+P`
7. Escribe: **"Supabase: Run Query"**
8. Presiona `Enter`

**Resultado esperado:**

```
✅ 1 row affected
```

### PASO 3: Verificar

1. Abre el archivo: **`sql-queries/step-3-verify.sql`**
2. Presiona `Ctrl+Shift+P`
3. Escribe: **"Supabase: Run Query"**
4. Presiona `Enter`

**Resultado esperado:**

```
email                      | role  | is_active | outlet_name
---------------------------|-------|-----------|-------------
paypalpago1978@gmail.com  | admin | true      | Atlantico
```

Si ves esto, **¡ÉXITO!** ✅

## 🎉 Prueba Final

1. Abre la aplicación ChefOS en el navegador
2. Inicia sesión con:
   - Email: `paypalpago1978@gmail.com`
   - Contraseña: (la contraseña del usuario)
3. Deberías ver:
   - ✅ Hotel Atlántico disponible
   - ✅ 4 empleados
   - ✅ 1000 ingredientes

## ⚠️ Si algo falla

### Error: "Cannot read from auth.users"

- La extensión usa `anon` key, que no tiene acceso a `auth.users`
- **Solución:** Usa el Dashboard de Supabase para el Paso 1
  1. Ve a https://app.supabase.com/project/xrgewhvijmrthsnrrxdw/sql
  2. Ejecuta el query de `step-1-get-user-uuid.sql` ahí
  3. Copia el UUID
  4. Vuelve a VS Code y continúa con el Paso 2

### Error: "permission denied for table profiles"

- Verifica que RLS esté configurado correctamente
- **Solución temporal:** Ejecuta desde el Dashboard de Supabase

### El usuario NO aparece en auth.users

- Sigue `step-0-create-auth-user.sql`
- Usa el Dashboard para crear el usuario primero

## 📝 Atajos Útiles

| Atajo                                       | Acción                |
| ------------------------------------------- | --------------------- |
| `Ctrl+Shift+P` → "Supabase: Run Query"      | Ejecutar query actual |
| `Ctrl+Shift+P` → "Supabase: Refresh Schema" | Actualizar tablas     |
| `Ctrl+Shift+P` → "Supabase: Open Dashboard" | Abrir dashboard web   |
| `Ctrl+S`                                    | Guardar archivo       |

## 🔗 Enlaces Útiles

- Dashboard SQL Editor: https://app.supabase.com/project/xrgewhvijmrthsnrrxdw/sql
- Auth Users: https://app.supabase.com/project/xrgewhvijmrthsnrrxdw/auth/users
- Documentación: [SOLUCION-USUARIO-PAYPALPAGO.md](../SOLUCION-USUARIO-PAYPALPAGO.md)
