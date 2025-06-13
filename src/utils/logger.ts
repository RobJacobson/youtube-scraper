import chalk from "chalk";

// Simple global state for logging
let isVerbose = false;
let startTime = Date.now();

// Initialize logger settings
export const initializeLogger = (verbose: boolean): void => {
  isVerbose = verbose;
  startTime = Date.now();
};

// Reset timer (used by scraping orchestrator)
export const resetTime = (): void => {
  startTime = Date.now();
};

// Get elapsed time as formatted string
const getElapsedSeconds = (): string => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  return elapsed.length < 4 ? ` ${elapsed}` : elapsed;
};

// Simple logging functions
export const log = {
  info: (message: string): void => {
    console.log(chalk.blue(`[${getElapsedSeconds()}s] ℹ️  ${message}`));
  },

  success: (message: string): void => {
    console.log(chalk.green(`[${getElapsedSeconds()}s] ✅ ${message}`));
  },

  error: (message: string): void => {
    console.error(chalk.red(`[${getElapsedSeconds()}s] ❌ ${message}`));
  },

  debug: (message: string): void => {
    if (isVerbose) {
      console.log(chalk.gray(`[${getElapsedSeconds()}s] 💭 ${message}`));
    }
  },
};
