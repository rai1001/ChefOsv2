# Análisis Completo del Proyecto ChefOsv2

**Fecha:** 2025-12-31
**Objetivo:** Identificar fallos actuales y proponer soluciones para eliminar dependencias de Google Cloud

---

## 1. RESUMEN EJECUTIVO

ChefOsv2 es una plataforma SaaS para gestión de cocinas profesionales con las siguientes características:

- **Arquitectura:** Clean Architecture con monorepo (pnpm workspaces)
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Backend:** Firebase Cloud Functions (Node.js 20)
- **Base de Datos:** Firestore
- **IA:** Google Cloud (Document AI, Vertex AI, Gemini 2.0 Flash)
- **Estado:** Zustand + Jotai
- **Testing:** Vitest + Playwright

### Funcionalidades Core

1. Gestión de Inventario FIFO con trazabilidad de lotes
2. Fichas Técnicas Versionadas con cálculo de costos
3. Compras Automáticas basadas en demanda
4. HACCP Digital con alertas críticas
5. Producción Kanban con scheduling inteligente
6. Analytics & Menu Engineering (Matriz de Boston)
7. Integración de IA para escaneo de facturas, BEO, Zero Waste Engine, Kitchen Copilot

---

## 2. FALLOS ACTUALES IDENTIFICADOS

### 2.1. Tests Fallidos (4 tests en packages/core)

#### A. ConsumeFIFOUseCase.test.ts (2 fallos)

**Test 1:** "should consume from multiple batches in FIFO order"
- **Error:** `Cannot read properties of undefined (reading 'multiply')`
- **Causa:** El mock del batch no está devolviendo `unitCost` correctamente
- **Ubicación:** `ConsumeFIFOUseCase.ts:70` - `batch.unitCost.multiply()`

**Test 2:** "should throw error if insufficient stock across all batches"
- **Error:** `Cannot read properties of undefined (reading 'remainingQuantity')`
- **Causa:** El batch mock no tiene `remainingQuantity` definido
- **Esperado:** "Insufficient stock in active batches"
- **Recibido:** Error de undefined

**Solución:** Corregir los mocks en el archivo de test para incluir todos los campos requeridos:
```typescript
const mockBatch = {
  id: 'batch-1',
  ingredientId: 'ing-1',
  remainingQuantity: new Quantity(10, Unit.KILOGRAMS),
  unitCost: new Money(5, 'EUR'),
  status: 'ACTIVE',
  // ... otros campos necesarios
};
```

#### B. AddBatchUseCase.test.ts (2 fallos)

**Test 1:** "should successfully add a batch and update ingredient stock"
- **Error:** Mock spy assertion mismatch
- **Esperado:** `findById('ing-1', { transaction: 'mock-txn' })`
- **Recibido:** `findById('ing-1', { transaction: 'mock-txn' })` (parece igual, pero el objeto options difiere)
- **Causa:** El test espera argumentos diferentes a los que realmente se pasan

**Test 2:** "should throw error if ingredient not found"
- **Error:** Mensaje de error no coincide
- **Esperado:** "Ingredient not found"
- **Recibido:** "Ingredient with ID missing not found"
- **Causa:** El mensaje de error en el Use Case es más descriptivo que el esperado en el test

**Solución:**
1. Actualizar las expectativas del test para que coincidan con la implementación real
2. O ajustar el mensaje de error en el Use Case para que sea más genérico

**Nivel de Severidad:** BAJO - Son errores de testing, no de lógica de negocio

---

### 2.2. Dependencias de Google Cloud (CRÍTICO)

El proyecto tiene una **dependencia crítica** de Google Cloud que afecta 20 archivos:

#### A. Firebase Cloud Functions

**Todas las funcionalidades del backend están implementadas como Cloud Functions:**

**Funciones Callable (16):**
- `scanInvoice` - Escaneo de facturas con Document AI
- `scanBEO` - Escaneo de menús/eventos
- `searchRecipes` - Búsqueda de recetas
- `chatWithCopilot` - Chat con IA (usa Vertex AI + Gemini)
- `predictDemand` - Predicción de demanda
- `generateMenu` - Generación de menús (usa Gemini)
- `generatePurchaseOrder` - Generación de órdenes (usa Gemini)
- `enrichIngredientCallable` - Enriquecimiento con IA
- `getMenuAnalytics` - Analytics de menú
- `getWasteSuggestions` - Sugerencias Zero Waste (usa Gemini)
- `applyWasteAction` - Aplicar acciones de residuos
- `commitImport` - Ingestion universal
- `analyzeDocument` - Análisis de documentos (usa Gemini)
- `parseStructuredFile` - Parsing de archivos
- `acceptInvitation` - Aceptar invitaciones
- `generateMarketingContent` - Contenido de marketing (usa Gemini)
- `generateSocialContent` - Contenido social (usa Gemini)

**Schedulers (8):**
- `autoPurchaseScheduler` - Cada 1 hora, genera órdenes automáticas
- `calculateMenuEngineering` - Análisis de matriz de Boston
- `generateMonthlyHACCPReport` - Reporte mensual HACCP
- `resetDailyBudgets` - Reset presupuestos diarios
- `sendWeeklyBudgetReport` - Reporte semanal presupuestario
- `checkStockAlerts` - Alertas de stock

**Database Triggers (9):**
- `onInventoryUpdate` - KPI de inventario
- `enrichIngredient` - Enriquecimiento automático (usa Vertex AI)
- `embedRecipe` - Embedding de recetas (usa Vertex AI)
- `monitorHACCP` - Monitoreo HACCP (puede usar IA)
- `createOrderNotification` - Notificaciones de órdenes
- `sendPurchaseOrderEmail` - Emails de órdenes
- `onBudgetUpdate` - Alertas presupuestarias
- `onInvitationCreated` - Invitaciones de usuarios

#### B. Google Cloud AI Services

**1. Document AI (`@google-cloud/documentai` v8.0.0)**
- **Uso:** Escaneo OCR de facturas en PDF/imágenes
- **Archivos afectados:**
  - `packages/functions/src/scanners/invoiceScanner.ts`
- **Funcionalidad crítica:** Extracción automática de datos de facturas

**2. Vertex AI (`@google-cloud/vertexai` v1.10.0)**
- **Uso:** LLMs avanzados y embeddings
- **Archivos afectados:**
  - `packages/functions/src/utils/ai.ts`
  - `packages/functions/src/chat/kitchenCopilot.ts`
  - `packages/functions/src/triggers/ingredientEnricher.ts`
  - `packages/functions/src/triggers/recipeEmbedder.ts`
  - `packages/functions/src/predictors/demandPredictor.ts`
  - `packages/functions/src/generators/menuGenerator.ts`
  - `packages/functions/src/waste/zeroWasteEngine.ts`
  - `packages/functions/src/socialChef.ts`
  - `packages/functions/src/socialManager.ts`
  - `packages/functions/src/triggers/beoScanner.ts`
  - `packages/functions/src/ingestion.ts`
  - `packages/functions/src/triggers/aiSmartImporter.ts`
  - `packages/functions/src/triggers/haccpMonitor.ts`

**Modelos utilizados:**
- `gemini-2.0-flash` - Generación de texto, chat, análisis
- `text-embedding-004` - Embeddings vectoriales para búsqueda semántica

**3. Firebase AI SDK**
- Integración con Gemini 2.0 Flash
- Usado en múltiples funciones callable

#### C. Funcionalidades que Dependen de Google Cloud AI

**Funcionalidades CRÍTICAS (necesitan alternativa de IA):**
1. **Escaneo de Facturas** - Document AI
2. **Kitchen Copilot (Chat)** - Vertex AI Gemini
3. **Enriquecimiento de Ingredientes** - Vertex AI Gemini
4. **Embeddings de Recetas** - Vertex AI text-embedding-004
5. **Búsqueda Semántica de Recetas** - Firestore Vector Search + embeddings
6. **Generación de Menús** - Gemini
7. **Generación de Órdenes de Compra** - Gemini
8. **Predicción de Demanda** - Gemini
9. **Zero Waste Engine** - Gemini
10. **Escaneo de BEO** - Gemini
11. **Social Manager** - Gemini
12. **Análisis de Documentos** - Gemini

**Funcionalidades NO CRÍTICAS (lógica pura, no dependen de IA):**
1. Gestión de Inventario FIFO
2. Fichas Técnicas Versionadas
3. Compras Automáticas (scheduler lógico)
4. HACCP Digital (con opción de monitoreo con IA)
5. Producción Kanban
6. Analytics & Menu Engineering (cálculos locales)
7. Gestión de Usuarios e Invitaciones
8. Notificaciones y Emails

---

## 3. OPCIONES DE SOLUCIÓN

### OPCIÓN A: Reparar Fallos Manteniendo Arquitectura Actual

**Acciones:**
1. ✅ Corregir 4 tests fallidos (1-2 horas)
2. ✅ Mantener Firebase Cloud Functions
3. ✅ Mantener Google Cloud AI (Document AI, Vertex AI)

**Ventajas:**
- Rápido de implementar
- Sin cambios arquitectónicos
- Todas las funcionalidades continúan funcionando

**Desventajas:**
- ❌ **RECHAZADO POR REQUISITO:** El usuario NO quiere usar Google Cloud
- Vendor lock-in con Google
- Costos escalables con uso de API

**Veredicto:** ❌ NO VIABLE - No cumple requisitos

---

### OPCIÓN B: Migración Completa a Backend Tradicional sin Google Cloud

**Arquitectura Propuesta:**

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19)                  │
│          Vite + TypeScript + Tailwind CSS               │
└───────────────────┬─────────────────────────────────────┘
                    │ HTTP/REST API
┌───────────────────▼─────────────────────────────────────┐
│              BACKEND (Node.js + Express)                │
│  ┌──────────────────────────────────────────────────┐   │
│  │ API Routes (REST o GraphQL)                      │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ Application Layer (Use Cases)                    │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ Domain Layer (@culinaryos/core)                  │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ Infrastructure Layer                             │   │
│  │  - Database Adapters (Prisma/TypeORM)            │   │
│  │  - AI Service (OpenAI/Anthropic/Local)           │   │
│  │  - Email Service (Nodemailer/Resend)             │   │
│  │  - Storage (S3/MinIO/Local)                      │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│                  PERSISTENCIA                           │
│  - PostgreSQL (BD Relacional)                           │
│  - Redis (Cache + Queues)                               │
│  - pgvector (Embeddings vectoriales)                    │
│  - S3/MinIO (Storage de archivos)                       │
└─────────────────────────────────────────────────────────┘
```

#### Cambios Principales:

**1. Reemplazar Firebase Cloud Functions → Express.js Backend**

**De:**
```typescript
// Firebase Callable Function
export const scanInvoice = onCall(async (request) => {
  const { gcsUri } = request.data;
  // ...
});
```

**A:**
```typescript
// Express Route
app.post('/api/invoices/scan', authenticate, async (req, res) => {
  const { fileUrl } = req.body;
  const result = await scanInvoiceUseCase.execute({ fileUrl, userId: req.user.id });
  res.json(result);
});
```

**2. Reemplazar Firestore → PostgreSQL + Prisma**

**De:**
```typescript
// Firestore
const doc = await db.collection('ingredients')
  .where('outletId', '==', outletId)
  .get();
```

**A:**
```typescript
// Prisma
const ingredients = await prisma.ingredient.findMany({
  where: { outletId }
});
```

**3. Reemplazar Document AI → Tesseract.js + GPT-4 Vision**

**De:**
```typescript
// Google Document AI
const client = new DocumentProcessorServiceClient();
const [result] = await client.processDocument(processRequest);
```

**A:**
```typescript
// Tesseract OCR + OpenAI GPT-4o Vision
import Tesseract from 'tesseract.js';
import OpenAI from 'openai';

// Opción 1: Tesseract para OCR básico
const { data: { text } } = await Tesseract.recognize(imageBuffer, 'spa');
const parsedData = await parseInvoiceWithLLM(text);

// Opción 2: GPT-4 Vision directamente (mejor calidad)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "Extrae los datos de esta factura en formato JSON" },
      { type: "image_url", image_url: { url: imageUrl } }
    ]
  }]
});
```

**4. Reemplazar Vertex AI Gemini → OpenAI GPT-4 / Anthropic Claude / Modelos Locales**

**De:**
```typescript
// Vertex AI Gemini
const vertexAI = new VertexAI({ project: projectId, location: 'europe-west1' });
const model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
const result = await model.generateContent(prompt);
```

**A (Opción 1: OpenAI):**
```typescript
// OpenAI GPT-4
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const completion = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: prompt }]
});
const text = completion.choices[0].message.content;
```

**A (Opción 2: Anthropic Claude):**
```typescript
// Anthropic Claude
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const message = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [{ role: "user", content: prompt }]
});
const text = message.content[0].text;
```

**A (Opción 3: Modelos Locales - Ollama):**
```typescript
// Ollama (Llama 3.2, Mistral, etc.) - 100% Local
import { Ollama } from 'ollama';
const ollama = new Ollama({ host: 'http://localhost:11434' });
const response = await ollama.chat({
  model: 'llama3.2',
  messages: [{ role: 'user', content: prompt }]
});
const text = response.message.content;
```

**5. Reemplazar Vertex AI Embeddings → OpenAI Embeddings / Local**

**De:**
```typescript
// Vertex AI text-embedding-004
const model = vertexAI.getGenerativeModel({ model: 'text-embedding-004' });
const result = await model.embedContent(text);
const embedding = result.embedding.values;
```

**A (Opción 1: OpenAI):**
```typescript
// OpenAI text-embedding-3-small
const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: text
});
const embedding = response.data[0].embedding;
```

**A (Opción 2: Local con Transformers.js):**
```typescript
// Transformers.js (100% Local, en Node.js)
import { pipeline } from '@xenova/transformers';
const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
const output = await embedder(text, { pooling: 'mean', normalize: true });
const embedding = Array.from(output.data);
```

**6. Reemplazar Firestore Vector Search → PostgreSQL pgvector**

**De:**
```typescript
// Firestore Vector Search
const vectorQuery = db.collection('recipes').findNearest({
  vectorField: '_embedding',
  queryVector: embedding,
  limit: 3,
  distanceMeasure: 'COSINE'
});
```

**A:**
```typescript
// PostgreSQL pgvector
const recipes = await prisma.$queryRaw`
  SELECT id, name, station,
         1 - (embedding <=> ${embedding}::vector) AS similarity
  FROM recipes
  ORDER BY embedding <=> ${embedding}::vector
  LIMIT 3
`;
```

**7. Reemplazar Firebase Schedulers → Node-Cron / BullMQ**

**De:**
```typescript
// Firebase Scheduler
export const autoPurchaseScheduler = onSchedule({
  schedule: 'every 1 hours',
  region: 'europe-southwest1'
}, async (event) => { /* ... */ });
```

**A (Opción 1: node-cron):**
```typescript
// node-cron (simple)
import cron from 'node-cron';
cron.schedule('0 * * * *', async () => {
  await autoPurchaseSchedulerService.execute();
});
```

**A (Opción 2: BullMQ con Redis - Recomendado):**
```typescript
// BullMQ (robusto, distribuido, con retry)
import { Queue, Worker } from 'bullmq';

const autoPurchaseQueue = new Queue('auto-purchase', {
  connection: { host: 'localhost', port: 6379 }
});

// Agregar job recurrente
await autoPurchaseQueue.add('check-stock', {}, {
  repeat: { pattern: '0 * * * *' } // Cada hora
});

// Worker para procesar
new Worker('auto-purchase', async (job) => {
  await autoPurchaseSchedulerService.execute();
}, { connection: { host: 'localhost', port: 6379 } });
```

**8. Reemplazar Firebase Storage → S3 / MinIO**

**De:**
```typescript
// Firebase Storage
const bucket = admin.storage().bucket();
await bucket.upload(filePath, { destination: `invoices/${fileName}` });
const [url] = await file.getSignedUrl({ action: 'read', expires: '03-01-2500' });
```

**A (AWS S3):**
```typescript
// AWS S3
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
const s3 = new S3Client({ region: 'eu-west-1' });
await s3.send(new PutObjectCommand({
  Bucket: 'culinaryos-invoices',
  Key: `invoices/${fileName}`,
  Body: fileBuffer
}));
```

**A (MinIO - S3 compatible, self-hosted):**
```typescript
// MinIO (100% self-hosted)
import { Client } from 'minio';
const minio = new Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin'
});
await minio.putObject('culinaryos-invoices', `invoices/${fileName}`, fileBuffer);
```

**9. Reemplazar Firebase Auth → JWT + Passport.js**

**De:**
```typescript
// Firebase Auth
const uid = request.auth?.uid;
if (!uid) throw new HttpsError('unauthenticated', 'Auth required');
```

**A:**
```typescript
// Express + JWT + Passport
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';

passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
}, async (payload, done) => {
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  return done(null, user);
}));

// Middleware
const authenticate = passport.authenticate('jwt', { session: false });

// Route
app.post('/api/protected', authenticate, (req, res) => {
  const user = req.user; // Usuario autenticado
  res.json({ message: 'OK' });
});
```

---

#### Stack Tecnológico Propuesto (Sin Google Cloud)

**Backend:**
- **Framework:** Express.js o Fastify
- **ORM:** Prisma (TypeScript-first)
- **Validación:** Zod (ya se usa)
- **Autenticación:** Passport.js + JWT
- **Rate Limiting:** express-rate-limit
- **Caching:** ioredis

**Base de Datos:**
- **Relacional:** PostgreSQL 16
- **Vector Search:** pgvector extension
- **Cache/Queue:** Redis 7
- **Migraciones:** Prisma Migrate

**IA & ML:**
- **LLM (Opción 1):** OpenAI GPT-4o (API cloud)
- **LLM (Opción 2):** Anthropic Claude 3.5 Sonnet (API cloud)
- **LLM (Opción 3):** Ollama + Llama 3.2 (100% local, gratis)
- **OCR (Opción 1):** OpenAI GPT-4o Vision
- **OCR (Opción 2):** Tesseract.js (local, gratis)
- **Embeddings (Opción 1):** OpenAI text-embedding-3-small
- **Embeddings (Opción 2):** Transformers.js local (Xenova/all-MiniLM-L6-v2)

**Storage:**
- **Cloud:** AWS S3 / Cloudflare R2 / Backblaze B2
- **Self-hosted:** MinIO (S3-compatible)

**Queue & Jobs:**
- **BullMQ** (Redis-backed, robusto)
- **Agenda** (MongoDB-backed, alternativa)

**Email:**
- **Resend** (ya se usa, mantener)
- **Nodemailer** (alternativa)

**Deployment:**
- **VPS:** DigitalOcean, Hetzner, Linode
- **Container:** Docker + Docker Compose
- **Orchestration:** Railway, Render, Fly.io
- **Self-hosted:** Ubuntu Server con Nginx reverse proxy

---

#### Estimación de Esfuerzo

**Fase 1: Setup Base (1 semana)**
- ✅ Configurar Express.js backend
- ✅ Configurar PostgreSQL + Prisma
- ✅ Configurar Redis
- ✅ Migrar autenticación a JWT
- ✅ Setup Docker Compose para desarrollo

**Fase 2: Migración de Datos (1 semana)**
- ✅ Crear schema Prisma desde Firestore
- ✅ Script de migración de datos Firestore → PostgreSQL
- ✅ Migrar Storage a S3/MinIO
- ✅ Testing de integridad de datos

**Fase 3: Migración de API (2 semanas)**
- ✅ Convertir Cloud Functions callable a REST endpoints
- ✅ Adaptar Use Cases para usar Prisma
- ✅ Implementar middleware de autenticación
- ✅ Testing de endpoints

**Fase 4: Migración de IA (2 semanas)**
- ✅ Reemplazar Gemini con OpenAI/Claude/Ollama
- ✅ Reemplazar Document AI con GPT-4 Vision o Tesseract
- ✅ Implementar embeddings con OpenAI o local
- ✅ Migrar vector search a pgvector
- ✅ Testing de funcionalidades IA

**Fase 5: Schedulers & Triggers (1 semana)**
- ✅ Implementar schedulers con BullMQ
- ✅ Convertir database triggers a webhooks/eventos
- ✅ Testing de jobs programados

**Fase 6: Testing & QA (1 semana)**
- ✅ Testing E2E completo
- ✅ Performance testing
- ✅ Security audit
- ✅ Load testing

**Total Estimado: 8 semanas (2 meses)**

---

#### Costos Comparativos

**Costos Mensuales - Google Cloud (actual):**
- Firebase Functions: ~$50-200/mes (según uso)
- Firestore: ~$30-100/mes
- Firebase Storage: ~$20-50/mes
- Document AI: $1.50 por 1000 páginas
- Vertex AI Gemini: ~$0.001 por 1000 tokens (~$50-200/mes según uso)
- **Total: ~$150-600/mes** (escala con uso)

**Costos Mensuales - Self-hosted (propuesto):**

**Opción 1: Cloud (OpenAI):**
- VPS (4 CPU, 8GB RAM): ~$20-40/mes (Hetzner, DigitalOcean)
- PostgreSQL managed: ~$15-25/mes (o incluido en VPS)
- Redis managed: ~$10-15/mes (o incluido en VPS)
- S3/R2 Storage: ~$5-20/mes
- OpenAI GPT-4o: ~$0.01/1K tokens (~$50-150/mes)
- OpenAI Embeddings: ~$0.0001/1K tokens (~$5-10/mes)
- **Total: ~$105-260/mes**

**Opción 2: Cloud (Anthropic):**
- VPS + DB + Redis + Storage: ~$50-90/mes
- Claude 3.5 Sonnet: ~$0.003/1K tokens (~$30-100/mes)
- OpenAI Embeddings: ~$5-10/mes
- **Total: ~$85-200/mes**

**Opción 3: 100% Self-hosted (Local AI):**
- VPS dedicado (8 CPU, 16GB RAM, GPU opcional): ~$50-100/mes
- PostgreSQL: incluido
- Redis: incluido
- MinIO: incluido
- Ollama (Llama 3.2): **GRATIS** (local)
- Transformers.js embeddings: **GRATIS** (local)
- Tesseract OCR: **GRATIS** (local)
- **Total: ~$50-100/mes** (FIJO, no escala con uso)

**Ahorro Potencial:**
- Con OpenAI: ~$50-340/mes (33-56% más barato)
- Con Claude: ~$65-400/mes (43-66% más barato)
- Con Local AI: ~$100-500/mes (66-83% más barato)

---

#### Ventajas de la Migración

✅ **Sin Vendor Lock-in:** Control total de la infraestructura
✅ **Costos Predecibles:** Especialmente con opción local
✅ **Mejor Performance:** DB relacional optimizada para queries complejas
✅ **Flexibilidad:** Cambiar de proveedor de IA fácilmente
✅ **Privacy:** Datos no salen del servidor (con opciones locales)
✅ **Escalabilidad:** Horizontal scaling con Docker/Kubernetes
✅ **Multi-region:** Deploy en múltiples regiones fácilmente

#### Desventajas

❌ **Más Responsabilidad:** Gestión de servidor, backups, seguridad
❌ **Tiempo de Desarrollo:** 2 meses de migración
❌ **DevOps Complexity:** Requiere expertise en Docker, Nginx, PostgreSQL
❌ **Sin Serverless:** No auto-scaling instant (pero se puede hacer con K8s)

---

### OPCIÓN C: Migración Híbrida (Gradual)

**Mantener Firebase para algunas cosas, migrar otras:**

**Fase 1:** Mantener Firestore + Firebase Auth
**Fase 2:** Migrar Cloud Functions a Express (deploy en Cloud Run)
**Fase 3:** Migrar IA a OpenAI/Claude
**Fase 4:** Migrar DB a PostgreSQL
**Fase 5:** Migrar Auth a JWT

**Ventajas:**
- Migración menos riesgosa
- Funcionalidades siguen operando durante migración
- Menos "big bang"

**Desventajas:**
- Más tiempo total (3-4 meses)
- Costos duplicados durante transición
- Complejidad de mantener dos sistemas

---

## 4. RECOMENDACIÓN FINAL

### Recomendación: OPCIÓN B - Migración Completa

**Justificación:**

1. **Cumple Requisito Crítico:** Elimina completamente dependencias de Google Cloud
2. **Mejor ROI a Largo Plazo:** Costos fijos predecibles, sin sorpresas
3. **Stack Moderno y Flexible:** Fácil cambiar proveedores de IA
4. **Clean Architecture Compatible:** El core domain ya está aislado
5. **Control Total:** Datos, infraestructura, escalabilidad

### Stack Recomendado Final

**Backend:**
- Express.js + TypeScript
- Prisma ORM
- PostgreSQL 16 + pgvector
- Redis 7
- BullMQ

**IA (Recomendación por funcionalidad):**

| Funcionalidad | Proveedor Recomendado | Alternativa |
|--------------|------------------------|-------------|
| Escaneo de Facturas | **OpenAI GPT-4o Vision** | Tesseract.js + GPT-4o |
| Kitchen Copilot (Chat) | **Anthropic Claude 3.5 Sonnet** | OpenAI GPT-4o |
| Enriquecimiento Ingredientes | **OpenAI GPT-4o** | Claude 3.5 |
| Embeddings | **OpenAI text-embedding-3-small** | Transformers.js local |
| Generación Menús | **Claude 3.5 Sonnet** | GPT-4o |
| Predicción Demanda | **GPT-4o** | Claude 3.5 |
| Zero Waste Engine | **Claude 3.5 Sonnet** | GPT-4o |

**Reasoning para elecciones:**
- **GPT-4o Vision:** Mejor del mercado para OCR de documentos complejos
- **Claude 3.5 Sonnet:** Mejor para razonamiento largo, análisis, generación de contenido
- **OpenAI Embeddings:** Mejor calidad/precio para embeddings
- **Transformers.js:** Opción local gratuita para embeddings si se quiere 100% privacy

**Storage:**
- **Cloudflare R2** (S3-compatible, sin costos de egress) o **MinIO** (self-hosted)

**Deployment:**
- **Railway** (simplicidad) o **VPS propio** con Docker Compose (control total)

---

## 5. PLAN DE ACCIÓN INMEDIATO

### Paso 1: Arreglar Tests Fallidos (HOY - 2 horas)

```bash
# Arreglar mocks en tests
1. Actualizar ConsumeFIFOUseCase.test.ts - agregar unitCost a mocks
2. Actualizar AddBatchUseCase.test.ts - ajustar expectativas
3. Ejecutar tests: pnpm --filter @culinaryos/core test
4. Verificar: todos los tests pasan
```

### Paso 2: Documentar Decisión (HOY - 1 hora)

```bash
# Crear ADR (Architecture Decision Record)
docs/ADR/005-migrar-sin-google-cloud.md
```

### Paso 3: Setup Proyecto Backend (MAÑANA - 4 horas)

```bash
# Crear nuevo package
mkdir packages/api
cd packages/api
pnpm init

# Instalar dependencias
pnpm add express @prisma/client prisma bcryptjs jsonwebtoken
pnpm add -D @types/express @types/bcryptjs @types/jsonwebtoken tsx

# Setup Prisma
npx prisma init
# Crear schema inicial
```

### Paso 4: Migración Gradual (SEMANAS 1-8)

Ver sección "Estimación de Esfuerzo" arriba.

---

## 6. RIESGOS Y MITIGACIONES

### Riesgo 1: Pérdida de Datos durante Migración
**Mitigación:**
- Backup completo de Firestore antes de migrar
- Migración gradual con rollback plan
- Mantener Firestore en read-only durante transición
- Validación exhaustiva post-migración

### Riesgo 2: Downtime Prolongado
**Mitigación:**
- Blue-Green deployment
- Migración en horario de menor uso
- Frontend debe funcionar en modo degradado

### Riesgo 3: Costos de IA Inesperados
**Mitigación:**
- Implementar rate limiting estricto
- Caching agresivo de respuestas IA
- Monitoreo de costos con alertas
- Opción de fallback a modelos locales

### Riesgo 4: Performance de Vector Search
**Mitigación:**
- Índices HNSW en pgvector optimizados
- Benchmark contra Firestore Vector Search
- Considerar Qdrant o Weaviate si pgvector no es suficiente

---

## 7. CONCLUSIÓN

El proyecto ChefOsv2 está bien arquitecturado con Clean Architecture, lo que facilita la migración. Los fallos actuales de tests son menores y fáciles de arreglar.

**La dependencia crítica de Google Cloud puede eliminarse completamente** migrando a un stack basado en:
- Express.js + PostgreSQL + Redis (backend)
- OpenAI/Anthropic/Ollama (IA)
- Docker (deployment)

Esto resultará en:
- ✅ **Costos 33-83% menores**
- ✅ **Sin vendor lock-in**
- ✅ **Control total de datos e infraestructura**
- ✅ **Flexibilidad para cambiar proveedores**

**Tiempo estimado: 8 semanas**
**Esfuerzo: Medio-Alto**
**ROI: Excelente a largo plazo**

---

## ANEXO A: Comparativa de Proveedores de IA

| Proveedor | Modelo | Input ($/1M tokens) | Output ($/1M tokens) | Latencia | Calidad |
|-----------|--------|---------------------|----------------------|----------|---------|
| OpenAI | GPT-4o | $2.50 | $10.00 | Media | Excelente |
| OpenAI | GPT-4o-mini | $0.15 | $0.60 | Baja | Buena |
| Anthropic | Claude 3.5 Sonnet | $3.00 | $15.00 | Media | Excelente |
| Anthropic | Claude 3.5 Haiku | $0.80 | $4.00 | Baja | Buena |
| Google | Gemini 2.0 Flash | $0.10 | $0.40 | Baja | Buena |
| Ollama | Llama 3.2 (local) | **GRATIS** | **GRATIS** | Alta* | Buena |
| Ollama | Mistral (local) | **GRATIS** | **GRATIS** | Alta* | Buena |

*Latencia alta solo en primera ejecución, luego cachea en RAM

---

## ANEXO B: Script de Migración de Datos (Ejemplo)

```typescript
// scripts/migrate-firestore-to-postgres.ts
import admin from 'firebase-admin';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
admin.initializeApp();
const db = admin.firestore();

async function migrateIngredients() {
  console.log('Migrating ingredients...');
  const snapshot = await db.collection('ingredients').get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    await prisma.ingredient.create({
      data: {
        id: doc.id,
        name: data.name,
        outletId: data.outletId,
        stock: data.stock || 0,
        unit: data.unit,
        costPerUnit: data.costPerUnit || 0,
        optimalStock: data.optimalStock,
        reorderPoint: data.reorderPoint,
        supplierId: data.supplierId,
        category: data.category,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      }
    });
  }

  console.log(`Migrated ${snapshot.size} ingredients`);
}

async function main() {
  await migrateIngredients();
  // await migrateBatches();
  // await migrateRecipes();
  // await migrateUsers();
  // ... más colecciones
}

main();
```

---

**Documento generado:** 2025-12-31
**Versión:** 1.0
**Autor:** Claude AI
**Estado:** DRAFT - Requiere aprobación
