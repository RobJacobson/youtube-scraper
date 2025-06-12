// Default backoff configuration constants
const DEFAULT_BASE_DELAY = 1000;
const DEFAULT_MAX_RETRIES = 3;
const JITTER_MULTIPLIER = 500;

export interface BackoffDelayer {
  delay(): Promise<void>;
}

export function createBackoffDelayer(
  baseDelay: number = DEFAULT_BASE_DELAY,
  maxRetries: number = DEFAULT_MAX_RETRIES
): BackoffDelayer {
  return {
    async delay(): Promise<void> {
      const jitter = Math.random() * JITTER_MULTIPLIER; // Add some randomness
      await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
    },
  };
}
