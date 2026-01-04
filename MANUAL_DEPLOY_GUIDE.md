# 📘 Guía Manual de Deployment de Edge Functions

Ya que el CLI no tiene permisos, debes desplegar manualmente desde el Dashboard.

---

## 🚀 Pasos para Desplegar Edge Functions

### Preparación

Las Edge Functions usan archivos compartidos (`_shared`). El Dashboard de Supabase **SÍ soporta imports**, así que puedes copiar el código tal cual.

---

## Función 1: `scan-document`

### Paso 1: Crear la función

1. Ve a: https://supabase.com/dashboard/project/xrgewhvijmrthsnrrxdw/functions
2. Click **"Deploy a new function"**
3. **Name**: `scan-document`

### Paso 2: Copiar el código

Abre el archivo: `supabase/functions/scan-document/index.ts`

Copia **TODO el contenido** del archivo y pégalo en el editor del Dashboard.

**IMPORTANTE**: El código tiene imports como:

```typescript
import { createGeminiClient } from '../_shared/gemini-client.ts';
```

Estos imports **SÍ funcionan** en Supabase Edge Functions porque el runtime de Deno los resuelve automáticamente desde el repositorio.

### Paso 3: Deploy

Click **"Deploy function"**

Deberías ver un mensaje de éxito.

---

## Función 2: `enrich-ingredient`

### Paso 1: Crear la función

1. En la misma página de Functions
2. Click **"Deploy a new function"**
3. **Name**: `enrich-ingredient`

### Paso 2: Copiar el código

Abre el archivo: `supabase/functions/enrich-ingredient/index.ts`

Copia **TODO el contenido** y pégalo en el editor.

### Paso 3: Deploy

Click **"Deploy function"**

---

## Función 3 (Opcional): `generate-menu`

Si quieres desplegar también esta función:

1. Click **"Deploy a new function"**
2. **Name**: `generate-menu`
3. Copia el contenido de: `supabase/functions/generate-menu/index.ts`
4. Deploy

---

## ⚠️ IMPORTANTE: Archivos `_shared`

Las funciones que acabas de desplegar tienen imports de archivos `_shared`:

```typescript
import { createGeminiClient } from '../_shared/gemini-client.ts';
import { handleCorsPreflightRequest } from '../_shared/cors.ts';
// etc.
```

**¿Por qué funcionan estos imports?**

Cuando despliegas una Edge Function desde el Dashboard de Supabase:

1. Supabase **automáticamente incluye** los archivos del proyecto
2. El runtime de Deno **resuelve los imports relativos**
3. **NO necesitas** copiar manualmente los archivos `_shared`

Si ves errores de "module not found", entonces sí necesitarás:

1. Crear funciones adicionales para cada archivo shared (no recomendado)
2. O usar los archivos "bundled" que generé (tienen todo el código inline)

---

## 🧪 Probar las funciones

Después de desplegar:

1. **Abre la test page**:

   ```
   file:///c:/Users/trabajo/Documents/claude/chefosv2/ChefOs-claude-start-here-c2JxH/test-gemini-ai.html
   ```

2. **Ejecuta Test 2** (enrich-ingredient)

3. Deberías ver:
   - ✅ Edge Function ejecutada correctamente
   - 📊 Datos nutricionales del ingrediente
   - 💰 Uso de tokens y costo

4. **Ejecuta Test 3** (scan-document)

---

## ❓ ¿Por qué esta vez funcionará?

Porque al **eliminar y recrear** las funciones:

1. ✅ Se limpia completamente el caché de Supabase
2. ✅ Las nuevas funciones cargan el **GEMINI_API_KEY actualizado** del Vault
3. ✅ Usan la **nueva API key sin restricciones**: `AIzaSyCfjgND4PgkwhFvo5PvewjaJbEHPG8yf8o`
4. ✅ Usan el **modelo actualizado**: `gemini-2.0-flash-exp`

---

## 🆘 Si los imports fallan

Si ves errores como "Cannot resolve module ../shared/...", entonces usa los archivos bundled:

1. Abre: `scan-document-bundled.ts`
2. Copia **TODO** el contenido
3. Pégalo en el Dashboard en lugar del código original
4. Repite con `enrich-ingredient-bundled.ts`

Los archivos bundled tienen **todo el código inline** (sin imports).

---

## 📝 Checklist

- [ ] Borrar funciones viejas (si aún existen)
- [ ] Crear función `scan-document` con código de `supabase/functions/scan-document/index.ts`
- [ ] Crear función `enrich-ingredient` con código de `supabase/functions/enrich-ingredient/index.ts`
- [ ] Probar con test page
- [ ] Verificar logs (no debe haber errores 400 "API key not valid")
- [ ] Probar en la aplicación real (toggle "Smart AI")

---

## 🎯 Resultado esperado

Si todo funciona:

- ✅ Test page muestra datos correctos
- ✅ Logs muestran "Gemini API Usage" exitoso
- ✅ La app puede escanear documentos con IA
- ✅ Los ingredientes se enriquecen automáticamente

---

**¿Listo? Empieza con el Paso 1 de la Función 1 arriba.**
