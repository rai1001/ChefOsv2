# Cómo Limitar el Gasto Máximo en Google Cloud

**Fecha:** 2025-12-31
**Objetivo:** Prevenir que los costos de IA excedan tu presupuesto

---

## 🎯 OPCIONES DISPONIBLES

### ✅ Opción 1: Presupuestos con Alertas (Fácil, NO bloquea)

**Qué hace:** Envía emails cuando llegas a cierto % del presupuesto
**Limitación:** ⚠️ NO detiene los servicios, solo avisa

**Configuración:**

1. Ve a: https://console.cloud.google.com/billing/016433-CFB844-2E8351/budgets?project=chefosv2

2. Click **"CREATE BUDGET"**

3. Configura:
   ```
   Budget name: ChefOsv2 AI Budget
   Projects: chefosv2
   Time range: Monthly
   Budget type: Specified amount
   Target amount: €10.00 (o tu límite deseado)
   ```

4. Configura alertas (Threshold rules):
   ```
   ✅ 50% of budget → Email notification
   ✅ 90% of budget → Email notification
   ✅ 100% of budget → Email notification
   ✅ 110% of budget → Email notification (ya pasaste)
   ```

5. En "Manage notifications":
   - Agrega tu email
   - Opcionalmente: conecta a Cloud Monitoring

**Ventajas:**
- ✅ Rápido de configurar (5 minutos)
- ✅ Te avisa a tiempo

**Desventajas:**
- ❌ NO detiene servicios automáticamente
- ❌ Podrías exceder el presupuesto si no revisas emails

---

### ✅ Opción 2: Quotas de API (Medio, SÍ bloquea)

**Qué hace:** Limita el número de llamadas a Vertex AI por día/minuto
**Limitación:** Protege de abusos pero no controla costo exacto

**Configuración:**

1. Ve a: https://console.cloud.google.com/apis/api/aiplatform.googleapis.com/quotas?project=chefosv2

2. Busca: **"Vertex AI API"**

3. Click en las quotas y ajusta:
   ```
   Online prediction requests per minute per project: 100
   (Por defecto es 60,000 - reducirlo previene spikes)

   Tokens per minute per project: 1,000,000
   (Reducir a 50,000 para limitar uso)
   ```

4. También puedes limitar en:
   - **Firestore:** https://console.cloud.google.com/firestore/quotas
   - **Cloud Functions:** https://console.cloud.google.com/functions/quotas

**Ventajas:**
- ✅ SÍ detiene llamadas cuando se alcanza
- ✅ Previene loops infinitos o errores de código

**Desventajas:**
- ❌ No controla costo exacto (solo número de llamadas)
- ❌ Puede bloquear usuarios legítimos en picos de tráfico

---

### ✅ Opción 3: Budget Control en Código (Avanzado, MEJOR)

**Qué hace:** Revisa presupuesto antes de cada llamada a IA
**Limitación:** Requiere implementación en código

He creado el archivo `packages/functions/src/utils/budgetControl.ts` con el código completo.

**Cómo usarlo:**

1. **En cada Cloud Function que use IA, agrega:**

```typescript
import { checkAIBudget } from '../utils/budgetControl';

export const chatWithCopilot = onCall(async (request) => {
  const uid = request.auth?.uid;

  // ✅ AGREGAR: Revisar presupuesto ANTES de llamar a IA
  await checkAIBudget('gemini-2.0-flash-chat', uid);

  // Resto del código...
  const vertexAI = new VertexAI({ /* ... */ });
  // ...
});
```

2. **Configurar límites en Firestore:**

Ve a Firestore Console y crea un documento:
```
Collection: config
Document ID: budget
Data:
{
  "dailyLimit": 0.50,      // €0.50/día
  "monthlyLimit": 15.0,    // €15/mes
  "enabled": true
}
```

3. **El sistema hará:**
   - ✅ Rechaza llamadas si excedes presupuesto diario
   - ✅ Rechaza llamadas si excedes presupuesto mensual
   - ✅ Guarda métricas en Firestore para análisis
   - ✅ Envía notificaciones cuando estás cerca del límite

**Ventajas:**
- ✅ Control exacto de costos
- ✅ Bloquea servicios automáticamente
- ✅ Dashboard de uso en tiempo real
- ✅ Alertas proactivas

**Desventajas:**
- ❌ Requiere modificar código de cada función
- ❌ Requiere deployment

---

### ✅ Opción 4: Deshabilitar Servicios Costosos (Nuclear, Máximo control)

**Qué hace:** Apaga completamente servicios si excedes presupuesto
**Limitación:** Puede dejar la app inutilizable

**Configuración con Pub/Sub + Cloud Function:**

1. **Crear tópico Pub/Sub para alertas de presupuesto:**
   ```bash
   gcloud pubsub topics create budget-alerts
   ```

2. **Conectar presupuesto a Pub/Sub:**
   - En presupuesto (Opción 1), agregar "Pub/Sub notification"
   - Topic: `budget-alerts`

3. **Cloud Function que escucha y deshabilita servicios:**

```typescript
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { ServiceUsageClient } from '@google-cloud/service-usage';

export const disableServicesOnBudgetExceeded = onMessagePublished(
  'budget-alerts',
  async (event) => {
    const message = event.data.message;
    const budgetData = JSON.parse(Buffer.from(message.data, 'base64').toString());

    // Si excedió el 100% del presupuesto
    if (budgetData.costAmount >= budgetData.budgetAmount) {
      console.error('BUDGET EXCEEDED - Disabling Vertex AI');

      const client = new ServiceUsageClient();
      await client.disableService({
        name: 'projects/chefosv2/services/aiplatform.googleapis.com',
      });

      // Enviar notificación crítica
      await admin.firestore().collection('notifications').add({
        type: 'CRITICAL',
        message: '🚨 AI Services disabled due to budget exceeded',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);
```

**⚠️ ADVERTENCIA:** Esto APAGA completamente Vertex AI. Solo usar si quieres seguridad total.

---

## 🎯 RECOMENDACIÓN PARA TU CASO

**Para ChefOsv2 (€0.65/mes actual):**

### Plan de 3 Capas:

1. **Inmediato (HOY):**
   - ✅ Configurar Presupuesto con Alertas → €10/mes
   - ✅ Configurar Quotas de Vertex AI → 100 req/min

2. **Esta semana:**
   - ✅ Implementar Budget Control en código
   - ✅ Configurar límites: €0.50/día, €15/mes

3. **Próximo mes:**
   - ✅ Revisar métricas y ajustar límites
   - ✅ Implementar caché (reduce 40-50% de llamadas)

---

## 📊 EJEMPLO DE LÍMITES RECOMENDADOS

Basado en tu uso actual (€0.65/mes):

```
Configuración Conservadora:
- Daily limit: €0.30/día (€9/mes)
- Monthly limit: €10/mes
- Vertex AI quota: 100 requests/min

Configuración Normal:
- Daily limit: €0.50/día (€15/mes)
- Monthly limit: €15/mes
- Vertex AI quota: 200 requests/min

Configuración Agresiva (crecimiento):
- Daily limit: €2.00/día (€60/mes)
- Monthly limit: €50/mes
- Vertex AI quota: 500 requests/min
```

**Mi recomendación:** Empieza con **Configuración Normal** y ajusta según necesidad.

---

## 🚨 QUÉ PASA CUANDO SE ALCANZA EL LÍMITE

### Con Budget Control implementado:

1. **Usuario intenta usar Kitchen Copilot (chat IA)**
2. Cloud Function ejecuta: `await checkAIBudget('gemini-2.0-flash-chat', uid)`
3. Sistema verifica: "Hoy: €0.45, Límite: €0.50, Llamada cuesta: €0.001"
4. Sistema responde: ✅ "OK, procede"
5. Llamada a Gemini se ejecuta
6. Sistema registra: "Hoy: €0.451"

**Más tarde ese día:**

1. Otro usuario intenta generar menú
2. Sistema verifica: "Hoy: €0.51, Límite: €0.50, Llamada cuesta: €0.002"
3. Sistema responde: ❌ **"Daily AI budget exceeded. Service temporarily unavailable."**
4. Usuario ve mensaje: "Servicio de IA no disponible temporalmente. Inténtalo mañana."
5. Notificación enviada a admin
6. Mañana a las 00:00 → límite se resetea automáticamente

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] **Paso 1:** Configurar presupuesto con alertas (5 min)
- [ ] **Paso 2:** Configurar quotas de Vertex AI (5 min)
- [ ] **Paso 3:** Crear documento `config/budget` en Firestore
- [ ] **Paso 4:** Agregar `checkAIBudget()` a funciones IA (30 min)
- [ ] **Paso 5:** Testear que bloquea cuando excede límite
- [ ] **Paso 6:** Deploy de Cloud Functions
- [ ] **Paso 7:** Monitorear primera semana
- [ ] **Paso 8:** Ajustar límites según uso real

---

## 📈 MONITOREO DE COSTOS EN TIEMPO REAL

**Dashboard de uso (implementado):**

Query en Firestore:
```javascript
// Ver uso de hoy
db.collection('budgetStats')
  .doc(`daily_${new Date().toISOString().split('T')[0]}`)
  .get()

// Ver uso del mes
db.collection('budgetStats')
  .doc(`monthly_${new Date().toISOString().substring(0, 7)}`)
  .get()
```

**Callable Function para obtener stats:**

```typescript
export const getAIBudgetStats = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Auth required');

  const controller = BudgetController.getInstance();
  const stats = await controller.getUsageStats();

  return {
    daily: stats.daily,
    monthly: stats.monthly,
    limits: {
      daily: 0.50,
      monthly: 15.0,
    },
  };
});
```

---

## ⚡ RESUMEN EJECUTIVO

**Para limitar gasto máximo en Google Cloud:**

1. **Rápido (5 min):** Presupuesto con alertas → €10/mes
2. **Seguro (10 min):** Quotas de API → Limita llamadas
3. **Ideal (1 hora):** Budget Control en código → Control exacto

**Tu mejor opción:** **Opción 3** (Budget Control) + **Opción 1** (Alertas de respaldo)

**Resultado:**
- ✅ Bloqueo automático si excedes €0.50/día o €15/mes
- ✅ Notificaciones cuando llegas al 90%
- ✅ Dashboard de uso en tiempo real
- ✅ 100% de seguridad contra costos inesperados

---

**Última actualización:** 2025-12-31
**Próxima revisión:** Después de 1 semana de uso
