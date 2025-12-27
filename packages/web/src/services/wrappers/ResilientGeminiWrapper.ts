// Simplified resilience wrapper without external dependencies
export class ResilientGeminiWrapper {
    private retryAttempts = 3;
    private timeoutMs = 30000;


    async execute<T>(fn: () => Promise<T>): Promise<T> {
        let lastError: any;

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                console.log(`[Resilience] Attempt ${attempt} of ${this.retryAttempts}...`);

                // Simple timeout implementation
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Operation timed out')), this.timeoutMs);
                });

                return await Promise.race([fn(), timeoutPromise]) as T;
            } catch (error: any) {
                lastError = error;
                console.warn(`[Resilience] Attempt ${attempt} failed:`, error.message);

                if (attempt < this.retryAttempts) {
                    // Exponential backoff
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        console.error("[Resilience] All attempts failed.");
        throw lastError;
    }
}
