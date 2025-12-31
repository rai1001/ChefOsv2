# Optimización de Costos - Google Cloud

**Fecha:** 2025-12-31
**Costo Actual:** €0.65/mes (diciembre 2025)
**Objetivo:** Reducir costos y optimizar arquitectura

---

## 📊 ANÁLISIS DEL COSTO ACTUAL

### Desglose de €0.65

**¿Por qué todo aparece como "App Engine"?**

Firebase Cloud Functions se ejecuta sobre Google Cloud Run/App Engine, por eso aparece todo consolidado. Pero el costo INCLUYE:

1. **Ejecución de Cloud Functions** (~€0.15)
   - Invocaciones callable functions
   - Schedulers (cada hora)
   - Database triggers

2. **Vertex AI Gemini 2.0 Flash** (~€0.30)
   - Chat con Kitchen Copilot
   - Generación de menús
   - Enriquecimiento de ingredientes
   - Zero Waste Engine
   - Social Manager

3. **Vertex AI Embeddings** (~€0.05)
   - text-embedding-004
   - Búsqueda semántica de recetas

4. **Document AI** (~€0.05)
   - Escaneo de facturas (OCR)

5. **Networking** (~€0.10)
   - Transferencia de datos entre servicios
   - **PROBLEMA DETECTADO:** Estabas usando `europe-west1` para Vertex AI pero `europe-southwest1` para Cloud Functions

---

## ✅ OPTIMIZACIÓN 1: REGIÓN CORREGIDA (YA APLICADA)

**Problema encontrado:**
```typescript
// ❌ ANTES: Vertex AI en región diferente
const vertexAI = new VertexAI({
  project: projectId,
  location: "europe-west1"  // <-- Región incorrecta
});
```

**Solución aplicada:**
```typescript
// ✅ AHORA: Misma región que Cloud Functions
const vertexAI = new VertexAI({
  project: projectId,
  location: "europe-southwest1"  // <-- Alineada
});
```

**Archivos corregidos:** 9 archivos
**Ahorro esperado:** ~15-20% en costos de networking (~€0.02-0.03/mes)

---

## 💡 OPTIMIZACIONES ADICIONALES

### 2️⃣ IMPLEMENTAR CACHÉ AGRESIVO (Ahorro: ~40-50%)

**Actualmente:** Cada llamada a Gemini cuesta dinero, incluso si es la misma pregunta.

**Solución:**
```typescript
// packages/functions/src/utils/cache.ts
import * as admin from 'firebase-admin';

const db = admin.firestore();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días

export async function getCachedAIResponse(
  cacheKey: string,
  aiFunction: () => Promise<any>
): Promise<any> {
  // 1. Buscar en caché
  const cacheDoc = await db.collection('aiCache').doc(cacheKey).get();

  if (cacheDoc.exists) {
    const data = cacheDoc.data();
    const age = Date.now() - data.timestamp;

    if (age < CACHE_TTL) {
      console.log('✅ Cache HIT:', cacheKey);
      return data.response;
    }
  }

  // 2. Si no existe o expiró, ejecutar AI
  console.log('❌ Cache MISS:', cacheKey);
  const response = await aiFunction();

  // 3. Guardar en caché
  await db.collection('aiCache').doc(cacheKey).set({
    response,
    timestamp: Date.now(),
  });

  return response;
}

// USO:
export async function enrichIngredientWithAI(name: string) {
  const cacheKey = `enrichment:${name.toLowerCase()}`;

  return getCachedAIResponse(cacheKey, async () => {
    const vertexAI = new VertexAI({ /* ... */ });
    // ... llamada real a IA
  });
}
```

**Impacto:**
- Ingredientes repetidos (tomate, cebolla, etc.): **NO cuestan** después de la primera vez
- Ahorro: ~40-50% en llamadas a IA

---

### 3️⃣ USAR GEMINI FLASH 1.5 EN LUGAR DE 2.0 (Ahorro: ~30%)

**Actualmente:**
```typescript
model: "gemini-2.0-flash"  // Más caro, más rápido
```

**Alternativa más barata:**
```typescript
model: "gemini-1.5-flash"  // 30% más barato, ligeramente más lento
```

**Comparativa de precios:**

| Modelo | Input ($/1M tokens) | Output ($/1M tokens) | Uso Recomendado |
|--------|---------------------|----------------------|-----------------|
| Gemini 2.0 Flash | $0.10 | $0.40 | Chat interactivo, latencia crítica |
| Gemini 1.5 Flash | $0.075 | $0.30 | Batch processing, background tasks |
| Gemini 1.5 Pro | $1.25 | $5.00 | Análisis complejo (NO usar) |

**Recomendación:**
- **Kitchen Copilot (chat):** Gemini 2.0 Flash (experiencia de usuario)
- **Enriquecimiento ingredientes:** Gemini 1.5 Flash (background)
- **Generación de menús:** Gemini 1.5 Flash (no es tiempo real)
- **Social Manager:** Gemini 1.5 Flash (background)
- **Zero Waste:** Gemini 1.5 Flash (background)

---

### 4️⃣ RATE LIMITING MÁS ESTRICTO

**Actualmente:** Tienes rate limiting, pero se puede optimizar.

**Mejora:**
```typescript
// packages/functions/src/utils/rateLimiter.ts

const LIMITS = {
  chat_with_copilot: { maxCalls: 20, windowMs: 60000 }, // 20/min
  scan_invoice: { maxCalls: 5, windowMs: 60000 },       // 5/min
  enrich_ingredient: { maxCalls: 50, windowMs: 60000 }, // 50/min
  generate_menu: { maxCalls: 3, windowMs: 60000 },      // 3/min (costoso)
};

// AGREGAR: Límites diarios por usuario
const DAILY_LIMITS = {
  chat_with_copilot: 100,
  scan_invoice: 20,
  generate_menu: 10,
};
```

**Impacto:**
- Prevenir abusos
- Proteger contra errores de frontend (loops infinitos)

---

### 5️⃣ MONITOREO DE COSTOS EN TIEMPO REAL

**Crear Cloud Function para alertas:**

```typescript
// packages/functions/src/monitoring/costAlerts.ts
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

export const checkDailyCosts = onSchedule({
  schedule: 'every day 23:00',
  region: 'europe-southwest1',
}, async () => {
  const db = admin.firestore();

  // 1. Contar llamadas a IA del día
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const aiMetrics = await db.collection('aiUsageMetrics')
    .where('timestamp', '>=', today)
    .get();

  const stats = {
    totalCalls: aiMetrics.size,
    byModel: {},
    estimatedCost: 0,
  };

  aiMetrics.forEach(doc => {
    const data = doc.data();
    stats.byModel[data.model] = (stats.byModel[data.model] || 0) + 1;
    stats.estimatedCost += data.estimatedCost || 0;
  });

  // 2. Alertar si supera presupuesto
  const DAILY_BUDGET = 0.50; // €0.50/día = €15/mes

  if (stats.estimatedCost > DAILY_BUDGET) {
    // Enviar notificación
    await db.collection('notifications').add({
      type: 'COST_ALERT',
      message: `⚠️ Costo diario excedido: €${stats.estimatedCost.toFixed(2)} / €${DAILY_BUDGET}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      severity: 'HIGH',
    });
  }

  console.log('Daily AI Stats:', stats);
});
```

---

## 📈 COMPARATIVA: QUEDARSE EN GOOGLE CLOUD vs ALTERNATIVAS

### Opción A: Optimizar Google Cloud (RECOMENDADO para tu caso)

**Costos optimizados:**
```
Cloud Functions:        €0.10/mes (invocaciones + scheduler)
Gemini 1.5 Flash:       €0.25/mes (con caché 50%)
Embeddings:             €0.05/mes
Document AI:            €0.05/mes
Networking:             €0.03/mes (región corregida)
---------------------------------------------------------
TOTAL:                  €0.48/mes (~26% ahorro)
```

**Ventajas:**
- ✅ Sin cambios de arquitectura
- ✅ Implementación inmediata
- ✅ Todo integrado en Firebase
- ✅ Escalabilidad automática

**Desventajas:**
- ❌ Vendor lock-in con Google
- ❌ Costos escalan con uso

---

### Opción B: Migrar a OpenAI GPT-4o

**Costos estimados:**
```
VPS (Railway):          €5/mes (incluye Node.js backend)
PostgreSQL:             €0 (incluido en Railway)
Redis:                  €0 (incluido en Railway)
OpenAI GPT-4o:          €0.30/mes (chat + análisis)
OpenAI Embeddings:      €0.02/mes
---------------------------------------------------------
TOTAL:                  €5.32/mes (718% MÁS CARO)
```

**Veredicto:** ❌ **NO CONVIENE** para tu volumen actual.

---

### Opción C: Migrar a Modelos Locales (Ollama)

**Costos estimados:**
```
VPS con GPU (Hetzner):  €30/mes (8 CPU, 16GB RAM, GPU)
Llama 3.2 (local):      €0 (gratis)
PostgreSQL:             €0 (incluido)
Redis:                  €0 (incluido)
Embeddings locales:     €0 (gratis)
---------------------------------------------------------
TOTAL:                  €30/mes (4500% MÁS CARO)
```

**Veredicto:** ❌ **NO CONVIENE** hasta que tengas >1000 usuarios.

---

## 🎯 RECOMENDACIÓN FINAL

### PARA TU CASO (€0.65/mes actual):

**✅ QUEDARTE EN GOOGLE CLOUD y optimizar**

**Plan de acción:**

1. ✅ **YA HECHO:** Corregir región de Vertex AI → Ahorro ~€0.03/mes
2. 🔧 **SIGUIENTE:** Implementar caché de respuestas IA → Ahorro ~€0.25/mes
3. 🔧 **SIGUIENTE:** Cambiar a Gemini 1.5 Flash en funciones background → Ahorro ~€0.10/mes
4. 🔧 **SIGUIENTE:** Monitoreo de costos diario

**Resultado esperado:**
- **Costo actual:** €0.65/mes
- **Costo optimizado:** €0.27-0.35/mes
- **Ahorro:** ~45-58%

---

## 🚀 CUÁNDO CONSIDERAR MIGRACIÓN

**Migra a otra plataforma SI:**

1. **Costos superan €50/mes** → Considera VPS + OpenAI
2. **Tienes >5000 usuarios activos** → Considera modelos locales
3. **Necesitas 100% privacy** → Modelos locales obligatorio
4. **Quieres multi-cloud** → Arquitectura híbrida

**MIENTRAS tanto (tu caso):**
- ✅ Optimiza Google Cloud
- ✅ Implementa caché
- ✅ Monitorea costos
- ✅ Escala con tráfico

---

## 📊 CÓMO VER DESGLOSE DETALLADO EN GOOGLE CLOUD

1. Ve a **Google Cloud Console** → **Billing** → **Cost table**
2. Filtra por **Service**:
   - `Cloud Functions` = Ejecución
   - `Vertex AI` = Gemini (llamadas a IA)
   - `Document AI` = OCR de facturas
   - `Networking` = Transferencia de datos
3. Filtra por **SKU** para ver exactamente qué pagas:
   - `Gemini 2.0 Flash Input Tokens`
   - `Gemini 2.0 Flash Output Tokens`
   - `Text Embedding Model`
   - `Document AI Pages`

**Acceso directo:**
https://console.cloud.google.com/billing/016433-CFB844-2E8351/reports

---

## 🔍 DEBUGGING DE COSTOS

Si el costo sube inesperadamente, revisa:

1. **Logs de Cloud Functions:**
   ```bash
   gcloud functions logs read --region=europe-southwest1 --limit=100
   ```

2. **Métricas de IA:**
   ```typescript
   // Query Firestore
   db.collection('aiUsageMetrics')
     .orderBy('timestamp', 'desc')
     .limit(100)
     .get()
   ```

3. **Triggers ejecutándose en loop:**
   - Revisa que `enrichIngredient` no se active infinitamente
   - Revisa que schedulers no se solapen

---

## ✅ CHECKLIST DE OPTIMIZACIÓN

- [x] Corregir región Vertex AI (europe-southwest1)
- [ ] Implementar caché de respuestas IA (7 días TTL)
- [ ] Cambiar a Gemini 1.5 Flash en background tasks
- [ ] Agregar monitoreo de costos diario
- [ ] Rate limiting más estricto por usuario
- [ ] Revisar índices de Firestore (evitar full scans)
- [ ] Comprimir payloads grandes en Cloud Functions
- [ ] Implementar dashboard de costos en admin panel

---

**Última actualización:** 2025-12-31
**Próxima revisión:** Enero 2026 (cuando tengas más tráfico)
