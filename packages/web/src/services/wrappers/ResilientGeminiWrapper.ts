// Advanced resilience wrapper with retry logic and simple circuit breaker
export class ResilientGeminiWrapper {
  private retryAttempts = 3;
  private baseDelayMs = 2000;
  private timeoutMs = 45000; // Increased timeout for heavy image analysis

  // Circuit Breaker State
  private failureThreshold = 5;
  private resetTimeoutMs = 60000; // 1 minute
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.checkCircuit();

    if (this.state === 'OPEN') {
      throw new Error('[Resilience] Circuit is OPEN. Gemini API is temporarily unavailable.');
    }

    let lastError: any;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`[Resilience] Attempt ${attempt} of ${this.retryAttempts}...`);

        // Timeout wrapper
        const result = await this.withTimeout(fn(), this.timeoutMs);

        this.onSuccess();
        return result;
      } catch (error: any) {
        lastError = error;
        const status = error?.status || error?.code;
        const message = error?.message || '';

        console.warn(`[Resilience] Attempt ${attempt} failed:`, {
          message,
          status,
          code: error?.code,
        });

        // Don't retry if it's a budget error (already handled by budgetManager, but just in case)
        if (message.includes('Budget exceeded')) {
          throw error;
        }

        // Handle specific status codes
        const isRateLimit = status === 429 || message.includes('429') || message.includes('quota');
        const isOverloaded =
          status === 503 || message.includes('503') || message.includes('overloaded');
        const isServiceUnavailable = status === 500 || message.includes('500');

        if (
          attempt < this.retryAttempts &&
          (isRateLimit || isOverloaded || isServiceUnavailable || message.includes('timed out'))
        ) {
          // Exponential backoff with jitter
          const delay = Math.pow(2, attempt) * this.baseDelayMs + Math.random() * 1000;
          console.log(`[Resilience] Backing off for ${Math.round(delay)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // If we reach here, we're not retrying
        this.onFailure();
        break;
      }
    }

    throw lastError;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]);
  }

  private checkCircuit() {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime > this.resetTimeoutMs) {
        console.log('[Resilience] Circuit transitioning to HALF_OPEN');
        this.state = 'HALF_OPEN';
      }
    }
  }

  private onSuccess() {
    if (this.state !== 'CLOSED') {
      console.log(`[Resilience] Circuit CLOSED (Success after ${this.state} state)`);
    }
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    console.warn(
      `[Resilience] Failure registered. Count: ${this.failureCount}/${this.failureThreshold}`
    );

    if (this.failureCount >= this.failureThreshold) {
      console.error(
        `[Resilience] Circuit Breaker OPENED (Threshold ${this.failureThreshold} reached)`
      );
      this.state = 'OPEN';
    }
  }
}
