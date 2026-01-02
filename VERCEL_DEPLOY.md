# 🚀 Deploy a Vercel - Guía Completa

## Framework a Elegir en Vercel

**Framework:** `Vite`

Tu proyecto usa **Vite** como bundler, NO Next.js ni Create React App.

---

## 📋 Pasos para Deploy

### 1. Conectar Repositorio a Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Click en **"Add New Project"**
3. Importa tu repositorio de GitHub
4. Selecciona la rama: `refactor/clean-architecture-fix`

### 2. Configuración del Proyecto

Vercel debería detectar automáticamente la configuración desde `vercel.json`, pero verifica:

**Framework Preset:** `Vite`

**Build Settings:**

- **Build Command:** `cd packages/web && npm run build`
- **Output Directory:** `packages/web/dist`
- **Install Command:** `npm install -g pnpm && pnpm install`

### 3. Variables de Entorno

En la sección **Environment Variables**, agrega:

```env
VITE_SUPABASE_URL=https://xrgewhvijmrthsnrrxdw.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_09GcoxV84nJjX5n2ZALgYg_G2YbQrU_
VITE_USE_SUPABASE_READ=true
VITE_ALLOW_E2E_BYPASS=false
```

**⚠️ IMPORTANTE:**

- NO incluyas las credenciales de Firebase (ya no son necesarias con Supabase)
- Asegúrate de usar `VITE_` como prefijo (Vite requiere este prefijo)

### 4. Root Directory

Si Vercel no detecta el monorepo correctamente:

- **Root Directory:** Déjalo vacío (raíz del proyecto)
- La configuración de `vercel.json` ya maneja el build desde `packages/web`

### 5. Deploy

Click en **"Deploy"** y espera 2-3 minutos.

---

## 🔧 Configuración Avanzada (Opcional)

### Rewrites para SPA

El archivo `vercel.json` ya incluye el rewrite necesario para que todas las rutas vayan a `index.html`:

```json
"rewrites": [
  {
    "source": "/(.*)",
    "destination": "/index.html"
  }
]
```

Esto asegura que rutas como `/ingredients`, `/recipes`, etc. funcionen correctamente.

### Optimizaciones de Build

El proyecto ya está optimizado con:

- ✅ Code splitting automático (Vite)
- ✅ Tree shaking
- ✅ Asset hashing para cache
- ✅ Source maps para debugging

---

## 🐛 Troubleshooting

### Error: "Module not found"

**Causa:** Problemas con workspace de pnpm
**Solución:** Verifica que el `installCommand` incluya `pnpm install`

### Error: "Build failed"

**Causa:** TypeScript errors o problemas de importación
**Solución:**

1. Ejecuta `pnpm build` localmente primero
2. Revisa los logs de build en Vercel
3. Asegúrate de que `packages/core` y `packages/ui` se compilen correctamente

### Error: "Page not found" en rutas

**Causa:** Falta configuración de rewrites
**Solución:** Verifica que `vercel.json` tenga el rewrite a `/index.html`

### Firebase no funciona

**Causa:** Ya no usas Firebase, ahora es Supabase
**Solución:**

- Elimina variables de Firebase
- Asegúrate de tener `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- Verifica que `VITE_USE_SUPABASE_READ=true`

---

## 📊 Post-Deploy

### Verificar que funcione:

1. **Abre la URL de Vercel** (ej: `https://tu-proyecto.vercel.app`)
2. **Prueba el Universal Importer:**
   - Ve a la página de Ingredientes
   - Click en "Universal Importer"
   - Sube un Excel con columnas: `Artículo`, `Proveedor`, `Precio`, `Unidad`
   - Verifica en la consola del navegador (F12) que aparezca:
     ```
     [Import] Created new supplier: FRUTAS BARREIRO (ID: ...)
     ```
3. **Verifica en Supabase Dashboard:**
   - Ve a https://xrgewhvijmrthsnrrxdw.supabase.co
   - Tabla `suppliers` → verás los proveedores creados
   - Tabla `ingredients` → verás `supplier_id` vinculado

### Configurar Dominio Personalizado (Opcional)

1. En Vercel → Settings → Domains
2. Agrega tu dominio (ej: `app.culinaryos.com`)
3. Configura DNS según las instrucciones de Vercel

---

## 🔄 Continuous Deployment

Vercel desplegará automáticamente:

- **Production:** Cuando hagas push a `main` o la rama configurada
- **Preview:** Cuando hagas push a otras ramas o abras PRs

Cada commit en `refactor/clean-architecture-fix` generará un deploy de preview.

---

## ✅ Checklist Final

- [ ] Framework seleccionado: **Vite**
- [ ] Build command: `cd packages/web && npm run build`
- [ ] Output directory: `packages/web/dist`
- [ ] Install command: `npm install -g pnpm && pnpm install`
- [ ] Variables de entorno de Supabase configuradas
- [ ] `VITE_USE_SUPABASE_READ=true`
- [ ] Rewrites configurados para SPA
- [ ] Deploy exitoso
- [ ] Universal Importer funciona
- [ ] Supabase conectado correctamente

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs de build en Vercel Dashboard
2. Ejecuta `pnpm build` localmente para replicar el error
3. Verifica las variables de entorno en Vercel Settings
4. Abre la consola del navegador (F12) para ver errores de runtime

**¡Listo para deploy!** 🚀
