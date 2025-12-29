# Plan de Implementación ML - ChefOsv2
## Presupuesto: €15/mes infraestructura + €863 créditos GenAI

---

## Resumen Ejecutivo

**Presupuesto Total**: €15/mes (infraestructura) + €863 (IA = 0 costo durante 12+ meses)

**Duración**: 12 meses sin costo de IA

**ROI Esperado**: 2,500% (ahorro de 15-20 horas/semana en tareas manuales)

---

## Desglose de Costos Mensuales

### Cubierto por Créditos GenAI (€0)
- ✅ **Document AI**: OCR de facturas (~€8/mes → GRATIS)
- ✅ **Vertex AI**: Clasificación y análisis (~€5/mes → GRATIS)
- ✅ **BigQuery ML**: Forecasting (~€3/mes → GRATIS)
- ✅ **Natural Language API**: Análisis de texto (~€2/mes → GRATIS)

**Subtotal cubierto**: €18/mes → **€0 durante 12 meses**

### Pagado con tu presupuesto (€15/mes)
- 💰 **Cloud Functions**: ~€8/mes (2M invocaciones)
- 💰 **Cloud Storage**: ~€3/mes (100GB imágenes/PDFs)
- 💰 **Firestore**: ~€3/mes (1M writes)
- 💰 **Networking**: ~€1/mes

**Total real**: €15/mes

---

## Use Cases Implementados

### Use Case #1: Smart Invoice OCR (PRIORIDAD 1)
**Problema**: Ingresar facturas manualmente toma 5-10 minutos por factura

**Solución**: Subir foto/PDF → IA extrae todo automáticamente

**Implementación**:
1. ✅ Cloud Function ya existe: `scanInvoice` (invoiceScanner.ts)
2. 🔨 Mejorar UI para subir desde SupplierPage
3. 🔨 Auto-matching de ingredientes con base de datos
4. 🔨 Sistema de feedback para aprendizaje continuo

**Ahorro**: 8 horas/semana → €800/mes (en tiempo de personal)

**Costo IA**: €0.015/factura (cubierto por créditos GenAI)

### Use Case #2: Demand Forecasting (PRIORIDAD 2)
**Problema**: Comprar de más o de menos ingredientes

**Solución**: IA predice demanda basándose en historial

**Implementación**:
```sql
-- BigQuery ML Model
CREATE MODEL chefos_ml.demand_forecaster
OPTIONS(model_type='ARIMA_PLUS') AS
SELECT date, ingredientId, quantity
FROM ingredient_consumption
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY);
```

**Ahorro**: 5-10% reducción de desperdicio → €500-1000/mes

**Costo**: €0 (BigQuery ML cubierto por créditos)

### Use Case #3: Document Classification (PRIORIDAD 3)
**Problema**: Clasificar manualmente facturas, menús, albaranes

**Solución**: IA detecta tipo de documento automáticamente

**Implementación**:
```typescript
// Cloud Function usando Vertex AI
const classifyDocument = async (base64Image: string) => {
  const vertex = new VertexAI({
    project: 'chefosv2',
    location: 'europe-west1'
  });

  const model = vertex.preview.getGenerativeModel({
    model: 'gemini-1.5-flash'
  });

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { text: 'Clasifica este documento: factura, albarán, menú o nota de pedido' },
        { inlineData: { mimeType: 'image/jpeg', data: base64Image }}
      ]
    }]
  });

  return result.response.text();
};
```

**Ahorro**: 2 horas/semana

**Costo**: €0.00025/imagen (cubierto por créditos)

### Use Case #4: Menu Engineering (PRIORIDAD 4)
**Problema**: No saber qué platos son rentables

**Solución**: IA analiza popularidad vs rentabilidad

**Implementación**:
```sql
-- BigQuery ML Clustering
CREATE MODEL chefos_ml.menu_clusters
OPTIONS(model_type='KMEANS', num_clusters=4) AS
SELECT
  dish_id,
  popularity_score,
  profit_margin,
  food_cost_percentage
FROM dish_analytics;
```

**Resultado**: Clasificación automática en Stars, Puzzles, Plowhorses, Dogs

**Ahorro**: Optimización de menú → 10-15% aumento de rentabilidad

---

## Roadmap de Implementación (4 meses)

### Mes 1: Smart Invoice OCR (Foundation)
**Semana 1-2**: UI para subir facturas
- [ ] Botón "Subir Factura" en SupplierPage
- [ ] Modal de preview antes de procesar
- [ ] Progress indicator durante procesamiento

**Semana 3-4**: Auto-matching de ingredientes
- [ ] Cloud Function para matching fuzzy
- [ ] UI de confirmación con sugerencias
- [ ] Sistema de feedback para correcciones

**Entregable**: Facturas se procesan en 30 segundos vs 10 minutos manual

### Mes 2: Demand Forecasting
**Semana 1-2**: Pipeline de datos
- [ ] Exportar consumo histórico a BigQuery
- [ ] Scheduled function para sincronización diaria
- [ ] Schema de datos optimizado

**Semana 3-4**: Modelo y UI
- [ ] Crear modelo ARIMA en BigQuery ML
- [ ] Dashboard de predicciones
- [ ] Alertas de stock basadas en forecast

**Entregable**: Predicciones de demanda a 30 días

### Mes 3: Document Classification
**Semana 1-2**: Vertex AI setup
- [ ] Cloud Function para clasificación
- [ ] Integrar en flujo de importación
- [ ] Auto-routing según tipo de documento

**Semana 3-4**: Refinamiento
- [ ] Entrenar con documentos reales
- [ ] Mejorar precisión (objetivo: >95%)
- [ ] Batch processing para documentos antiguos

**Entregable**: Clasificación automática de documentos

### Mes 4: Menu Engineering
**Semana 1-2**: Analytics pipeline
- [ ] Exportar ventas de platos a BigQuery
- [ ] Calcular métricas (popularity, profit, cost%)
- [ ] Crear modelo de clustering

**Semana 3-4**: Dashboard
- [ ] Visualización matriz Boston
- [ ] Recomendaciones automáticas
- [ ] Simulador de cambios de precio

**Entregable**: Dashboard de ingeniería de menú

---

## Arquitectura Técnica

### Stack Completo
```
┌─────────────────────────────────────────┐
│         Frontend (React)                │
│  - Upload UI                            │
│  - Preview & Confirmation               │
│  - Dashboards                           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    Cloud Functions (Node.js)            │
│  - File handling                        │
│  - Orchestration                        │
│  - Business logic                       │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
┌──────────────┐  ┌──────────────────┐
│ Document AI  │  │   Vertex AI      │
│ (OCR)        │  │ (Classification) │
└──────────────┘  └──────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         BigQuery ML                     │
│  - Historical data                      │
│  - Forecasting models                   │
│  - Analytics                            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Firestore                       │
│  - Transactional data                   │
│  - Real-time updates                    │
│  - User data                            │
└─────────────────────────────────────────┘
```

### Flujo de Invoice OCR
```
1. Usuario sube PDF/imagen → Cloud Storage
2. Cloud Function triggered → llama Document AI
3. Document AI extrae datos → JSON estructurado
4. Cloud Function hace fuzzy matching de ingredientes
5. Frontend muestra preview con sugerencias
6. Usuario confirma/corrige → guarda en Firestore
7. Correcciones se guardan para reentrenamiento
```

---

## Setup Inicial (Hacer YA)

### 1. Habilitar APIs en Google Cloud

```bash
gcloud services enable documentai.googleapis.com
gcloud services enable aiplatform.googleapis.com
gcloud services enable bigquery.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable storage.googleapis.com
```

### 2. Crear Document AI Processor

```bash
# Ve a: Cloud Console > Document AI > Processors
# 1. Click "CREATE PROCESSOR"
# 2. Selecciona "Invoice Parser"
# 3. Región: "eu" (Europa)
# 4. Copia el PROCESSOR_ID

# Añadir al .env
echo "DOCUMENT_AI_PROCESSOR_ID=your-processor-id" >> packages/functions/.env
```

### 3. Configurar BigQuery

```bash
# Crear dataset
bq mk --location=EU chefos_ml

# Crear tabla de consumo histórico
bq mk --table chefos_ml.ingredient_consumption \
  date:DATE,ingredientId:STRING,quantity:FLOAT,outletId:STRING
```

### 4. Desplegar Functions Actualizadas

```bash
cd packages/functions
npm install @google-cloud/documentai @google-cloud/aiplatform
firebase deploy --only functions:scanInvoice
```

---

## Monitoreo de Costos

### Dashboard de Google Cloud
1. **Cloud Console > Billing > Reports**
2. Filtrar por servicio
3. Configurar alertas:
   - Alert si costo mensual > €20
   - Alert si Document AI > 500 requests/día

### Comandos útiles
```bash
# Ver costos actuales
gcloud billing accounts list
gcloud billing projects describe chefosv2

# Ver uso de Document AI
gcloud alpha document-ai processors list --location=eu

# Ver invocaciones de Functions
gcloud functions logs read scanInvoice --limit=50
```

---

## KPIs de Éxito

### Mes 1
- [ ] 90% de facturas procesadas sin intervención manual
- [ ] <30 segundos tiempo de procesamiento
- [ ] >95% precisión en extracción de totales

### Mes 2
- [ ] Forecast con <15% error (MAPE)
- [ ] Reducción 10% en sobre-stock

### Mes 3
- [ ] >95% precisión en clasificación de documentos
- [ ] 50% reducción en tiempo de organización

### Mes 4
- [ ] 100% de platos clasificados en matriz
- [ ] 3 recomendaciones accionables por semana

---

## Troubleshooting

### Error: "DOCUMENT_AI_PROCESSOR_ID missing"
**Solución**: Crear processor en Cloud Console y añadir ID al .env

### Error: "Permission denied Document AI"
**Solución**:
```bash
# Dar permisos a Service Account
gcloud projects add-iam-policy-binding chefosv2 \
  --member="serviceAccount:chefosv2@appspot.gserviceaccount.com" \
  --role="roles/documentai.apiUser"
```

### Costos más altos de lo esperado
**Checklist**:
- [ ] Verificar no hay loops infinitos en Functions
- [ ] Confirmar rate limiting activado
- [ ] Revisar si Document AI está usando processor correcto (Invoice, no Form)

---

## Próximos Pasos Inmediatos

1. **Ahora mismo**: Habilitar Document AI API
2. **Hoy**: Crear Invoice Processor en Cloud Console
3. **Esta semana**: Implementar UI de upload en SupplierPage
4. **Próxima semana**: Testing con 10 facturas reales

---

## Resumen de Costos (12 meses)

| Concepto | Costo Mensual | Costo Anual | Cubierto por Créditos |
|----------|---------------|-------------|----------------------|
| Document AI | €8 | €96 | ✅ €96 |
| Vertex AI | €5 | €60 | ✅ €60 |
| BigQuery ML | €3 | €36 | ✅ €36 |
| Natural Language | €2 | €24 | ✅ €24 |
| **Subtotal IA** | **€18** | **€216** | **€216/€863 (25%)** |
| Cloud Functions | €8 | €96 | ❌ |
| Cloud Storage | €3 | €36 | ❌ |
| Firestore | €3 | €36 | ❌ |
| Networking | €1 | €12 | ❌ |
| **Subtotal Infra** | **€15** | **€180** | **€0** |
| **TOTAL** | **€33/mes** | **€396/año** | **€216 cubierto** |
| **Coste Real** | **€15/mes** | **€180/año** | **54% descuento** |

**Créditos restantes tras 12 meses**: €863 - €216 = **€647**

---

**Última actualización**: 2025-12-29
**Presupuesto aprobado**: €15/mes
**Estado**: ✅ LISTO PARA IMPLEMENTAR
