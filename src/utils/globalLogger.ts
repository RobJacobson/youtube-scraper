import { Logger } from "./Logger";

let logger: Logger;

export function initializeLogger(verbose: boolean): void {
  logger = new Logger(verbose);
}

export function getLogger(): Logger {
  if (!logger) {
    throw new Error("Logger not initialized. Call initializeLogger() first.");
  }
  return logger;
}
