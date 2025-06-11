export class ExponentialBackoff {
  constructor(
    private baseDelay: number = 1000,
    private maxRetries: number = 3,
    private maxDelay: number = 30000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === this.maxRetries) {
          throw lastError;
        }

        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          this.maxDelay
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  async delay(): Promise<void> {
    const jitter = Math.random() * 500; // Add some randomness
    await new Promise(resolve => setTimeout(resolve, this.baseDelay + jitter));
  }
} 