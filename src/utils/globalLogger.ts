import { Logger } from "./Logger";

let logger: Logger;
let startTime: number = Date.now();

export function initializeLogger(verbose: boolean): void {
  logger = new Logger(verbose);
  startTime = Date.now(); // Reset start time when initializing
}

export function resetTime(): void {
  startTime = Date.now();
}

export function getElapsedSeconds(): string {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  // Pad with leading space if less than 10 seconds
  return elapsed.length < 4 ? ` ${elapsed}` : elapsed;
}

export function getLogger(): Logger {
  if (!logger) {
    throw new Error("Logger not initialized. Call initializeLogger() first.");
  }
  return logger;
}
