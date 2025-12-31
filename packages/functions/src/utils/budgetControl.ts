/**
 * Control de presupuesto para llamadas a IA
 * Previene que los costos excedan el límite configurado
 */

import * as admin from 'firebase-admin';

const db = admin.firestore();

interface BudgetConfig {
  dailyLimit: number; // €/día
  monthlyLimit: number; // €/mes
  enabled: boolean;
}

interface UsageStats {
  date: string;
  totalCost: number;
  callCount: number;
}

const DEFAULT_BUDGET: BudgetConfig = {
  dailyLimit: 0.50, // €0.50/día = €15/mes
  monthlyLimit: 15.0, // €15/mes
  enabled: true,
};

/**
 * Costo aproximado por tipo de llamada (en euros)
 */
const COST_PER_CALL = {
  'gemini-2.0-flash-chat': 0.001, // ~1000 tokens promedio
  'gemini-2.0-flash-generation': 0.002, // ~2000 tokens promedio
  'text-embedding-004': 0.0001, // Embeddings
  'document-ai': 0.015, // Por página
};

export class BudgetController {
  private static instance: BudgetController;
  private budgetConfig: BudgetConfig = DEFAULT_BUDGET;

  private constructor() {}

  static getInstance(): BudgetController {
    if (!BudgetController.instance) {
      BudgetController.instance = new BudgetController();
    }
    return BudgetController.instance;
  }

  /**
   * Verifica si se puede ejecutar una llamada a IA
   * @throws Error si se excede el presupuesto
   */
  async checkBudget(callType: string, userId?: string): Promise<void> {
    if (!this.budgetConfig.enabled) {
      return; // Budget control deshabilitado
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const month = today.substring(0, 7); // YYYY-MM

    // 1. Obtener estadísticas del día
    const dailyStatsRef = db.collection('budgetStats').doc(`daily_${today}`);
    const dailyStats = await dailyStatsRef.get();

    const dailyCost = dailyStats.exists ? (dailyStats.data() as UsageStats).totalCost : 0;
    const estimatedCost = COST_PER_CALL[callType as keyof typeof COST_PER_CALL] || 0.001;

    // 2. Verificar límite diario
    if (dailyCost + estimatedCost > this.budgetConfig.dailyLimit) {
      const error = `Daily budget exceeded: €${dailyCost.toFixed(2)} / €${this.budgetConfig.dailyLimit}`;
      console.error(error);

      // Notificar al admin
      await this.sendBudgetAlert('DAILY_LIMIT_EXCEEDED', dailyCost, this.budgetConfig.dailyLimit);

      throw new Error('Daily AI budget exceeded. Service temporarily unavailable.');
    }

    // 3. Verificar límite mensual
    const monthlyStatsRef = db.collection('budgetStats').doc(`monthly_${month}`);
    const monthlyStats = await monthlyStatsRef.get();
    const monthlyCost = monthlyStats.exists
      ? (monthlyStats.data() as UsageStats).totalCost
      : 0;

    if (monthlyCost + estimatedCost > this.budgetConfig.monthlyLimit) {
      const error = `Monthly budget exceeded: €${monthlyCost.toFixed(2)} / €${this.budgetConfig.monthlyLimit}`;
      console.error(error);

      await this.sendBudgetAlert(
        'MONTHLY_LIMIT_EXCEEDED',
        monthlyCost,
        this.budgetConfig.monthlyLimit
      );

      throw new Error('Monthly AI budget exceeded. Service temporarily unavailable.');
    }

    // 4. Registrar la llamada
    await this.recordUsage(today, month, estimatedCost, callType, userId);
  }

  /**
   * Registra el uso de IA para tracking
   */
  private async recordUsage(
    today: string,
    month: string,
    cost: number,
    callType: string,
    userId?: string
  ): Promise<void> {
    const batch = db.batch();

    // Actualizar stats diarias
    const dailyRef = db.collection('budgetStats').doc(`daily_${today}`);
    batch.set(
      dailyRef,
      {
        date: today,
        totalCost: admin.firestore.FieldValue.increment(cost),
        callCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Actualizar stats mensuales
    const monthlyRef = db.collection('budgetStats').doc(`monthly_${month}`);
    batch.set(
      monthlyRef,
      {
        month,
        totalCost: admin.firestore.FieldValue.increment(cost),
        callCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Guardar detalle de la llamada
    const detailRef = db.collection('aiUsageMetrics').doc();
    batch.set(detailRef, {
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      callType,
      estimatedCost: cost,
      userId: userId || 'anonymous',
      date: today,
      month,
    });

    await batch.commit();
  }

  /**
   * Envía alerta cuando se excede el presupuesto
   */
  private async sendBudgetAlert(
    type: string,
    currentCost: number,
    limit: number
  ): Promise<void> {
    await db.collection('notifications').add({
      type: 'BUDGET_ALERT',
      severity: 'CRITICAL',
      alertType: type,
      message: `⚠️ AI Budget Alert: €${currentCost.toFixed(2)} / €${limit.toFixed(2)}`,
      currentCost,
      limit,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });

    console.error(`BUDGET ALERT [${type}]: €${currentCost.toFixed(2)} / €${limit.toFixed(2)}`);
  }

  /**
   * Obtiene las estadísticas de uso actuales
   */
  async getUsageStats(): Promise<{
    daily: UsageStats | null;
    monthly: UsageStats | null;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const month = today.substring(0, 7);

    const [dailySnap, monthlySnap] = await Promise.all([
      db.collection('budgetStats').doc(`daily_${today}`).get(),
      db.collection('budgetStats').doc(`monthly_${month}`).get(),
    ]);

    return {
      daily: dailySnap.exists ? (dailySnap.data() as UsageStats) : null,
      monthly: monthlySnap.exists ? (monthlySnap.data() as UsageStats) : null,
    };
  }

  /**
   * Actualiza la configuración del presupuesto
   */
  async updateBudgetConfig(config: Partial<BudgetConfig>): Promise<void> {
    this.budgetConfig = { ...this.budgetConfig, ...config };

    await db.collection('config').doc('budget').set(this.budgetConfig);
    console.log('Budget config updated:', this.budgetConfig);
  }

  /**
   * Carga la configuración desde Firestore
   */
  async loadConfig(): Promise<void> {
    const configDoc = await db.collection('config').doc('budget').get();

    if (configDoc.exists) {
      this.budgetConfig = { ...DEFAULT_BUDGET, ...configDoc.data() };
    } else {
      // Crear config por defecto
      await db.collection('config').doc('budget').set(DEFAULT_BUDGET);
    }
  }
}

// Helper function para usar en Cloud Functions
export async function checkAIBudget(callType: string, userId?: string): Promise<void> {
  const controller = BudgetController.getInstance();
  await controller.loadConfig();
  await controller.checkBudget(callType, userId);
}
