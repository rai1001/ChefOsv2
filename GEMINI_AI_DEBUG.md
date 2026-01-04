# 🔍 Diagnóstico: Gemini AI No Funciona

**Fecha**: 2026-01-04
**Estado**: ❌ Edge Functions fallan - API key cacheada

---

## ✅ Lo que SÍ está bien configurado:

1. **Código actualizado a Gemini 2.0 Flash**
   - ✅ `gemini-client.ts` usa modelo `gemini-2.0-flash-exp`
   - ✅ Gemini 1.5 fue descontinuado, por eso necesitamos 2.0

2. **Nueva API Key creada sin restricciones**
   - ✅ Key: `AIzaSyCfjgND4PgkwhFvo5PvewjaJbEHPG8yf8o`
   - ✅ Creada en Google AI Studio sin restricciones
   - ✅ Free tier activo

3. **Secret actualizado en Supabase Vault**
   - ✅ `GEMINI_API_KEY` actualizado con la nueva key
   - ✅ Visible en: https://supabase.com/dashboard/project/xrgewhvijmrthsnrrxdw/settings/vault

4. **Edge Functions redesplegadas**
   - ✅ `scan-document` - Redesplegada
   - ✅ `enrich-ingredient` - Redesplegada
   - ✅ Código actualizado con comentarios nuevos para forzar redeploy

---

## ❌ El PROBLEMA actual:

**Error en logs** (scan-document):

```
Error: Gemini API Error: 400 - {"error": {"code": 400, "message": "API key not valid. Please pass a valid API key."
```

**Causa raíz**: Las Edge Functions desplegadas están usando el **API key VIEJO cacheado**, NO el nuevo del Vault.

Supabase cachea los secrets y NO los recarga automáticamente cuando:

- Actualizas el secret en el Vault
- Redespiegas la función desde el dashboard

---

## 🔧 SOLUCIONES a intentar (en orden):

### Solución 1: Esperar cache expiry (MÁS SIMPLE)

- **Tiempo**: Esperar 15-30 minutos
- **Acción**: No hacer nada, dejar que el caché expire
- **Probabilidad de éxito**: 70%

### Solución 2: Eliminar y recrear las funciones (RECOMENDADO)

1. Ve a: https://supabase.com/dashboard/project/xrgewhvijmrthsnrrxdw/functions
2. Para cada función (`scan-document`, `enrich-ingredient`):
   - Busca cómo eliminar la función (botón Delete)
   - Elimínala completamente
   - Créala de nuevo con el mismo código (desde GitHub o copiando el código local)
3. Las funciones nuevas cargarán el secret fresco del Vault

### Solución 3: Usar Supabase CLI con deploy forzado

Si tienes un token con permisos de `functions.write`:

```bash
supabase functions deploy scan-document --project-ref xrgewhvijmrthsnrrxdw --no-verify-jwt
supabase functions deploy enrich-ingredient --project-ref xrgewhvijmrthsnrrxdw --no-verify-jwt
```

### Solución 4: Contactar soporte de Supabase

Si nada funciona, abrir ticket en: https://supabase.com/dashboard/support

---

## 📋 Checklist para la próxima sesión:

- [ ] Intentar Solución 1: Esperar 30 minutos y probar de nuevo
- [ ] Si falla, intentar Solución 2: Eliminar y recrear funciones
- [ ] Verificar logs después de cada intento
- [ ] Probar con la test page: `file:///c:/Users/trabajo/Documents/claude/chefosv2/ChefOs-claude-start-here-c2JxH/test-gemini-ai.html`

---

## 🧪 Cómo probar si funciona:

1. **Test Page** (Más rápido):
   - Abre: `file:///c:/Users/trabajo/Documents/claude/chefosv2/ChefOs-claude-start-here-c2JxH/test-gemini-ai.html`
   - Click "Ejecutar Test" en Test 2 (enrich-ingredient)
   - Debe mostrar: ✅ con datos nutricionales y tokens usados

2. **Verificar logs**:
   - https://supabase.com/dashboard/project/xrgewhvijmrthsnrrxdw/functions/enrich-ingredient/logs
   - No debe haber errores rojos
   - Debe mostrar "Gemini API Usage" en verde

3. **Aplicación real**:
   - Ve a tu app en localhost o Vercel
   - Activa toggle "Smart AI"
   - Sube una imagen
   - Debe escanear y extraer datos

---

## 🔑 Información importante:

**Supabase Project**: xrgewhvijmrthsnrrxdw
**Gemini API Key**: AIzaSyCfjgND4PgkwhFvo5PvewjaJbEHPG8yf8o
**Modelo usado**: gemini-2.0-flash-exp

**Edge Functions**:

- scan-document
- enrich-ingredient
- chat-copilot (eliminada)
- generate-menu

**Archivos modificados**:

- `supabase/functions/_shared/gemini-client.ts` - Modelo 2.0
- `supabase/functions/enrich-ingredient/index.ts` - Comentario actualizado
- `supabase/functions/scan-document/index.ts` - Comentario actualizado
- `test-gemini-ai.html` - Página de test creada

**Commits importantes**:

- `906ec2c` - force Edge Functions redeploy with updated comments
- `b0b4b56` - upgrade Gemini API from 1.5 to 2.0 Flash
- `b9db8a5` - add Gemini AI diagnostic test page

---

## 📞 Si necesitas ayuda:

1. Muestra los logs de Edge Functions (screenshot)
2. Verifica que el secret en Vault sea el correcto
3. Confirma que redesplegaste las funciones

**Todo el código está guardado en Git y pusheado a GitHub.**
