export class ExponentialBackoff {
  constructor(
    private baseDelay: number = 1000,
    private maxRetries: number = 3
  ) {}

  async delay(): Promise<void> {
    const jitter = Math.random() * 500; // Add some randomness
    await new Promise(resolve => setTimeout(resolve, this.baseDelay + jitter));
  }
} 