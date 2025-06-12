import chalk from "chalk";

export class Logger {
  constructor(private verbose: boolean = false) {}

  private getTimeStamp(): string {
    // Import here to avoid circular dependency
    const { getElapsedSeconds } = require("./globalLogger");
    return `[${getElapsedSeconds()}s]`;
  }

  info(message: string): void {
    console.log(chalk.blue(`${this.getTimeStamp()} ℹ️  ${message}`));
  }

  success(message: string): void {
    console.log(chalk.green(`${this.getTimeStamp()} ✅ ${message}`));
  }

  error(message: string): void {
    console.error(chalk.red(`${this.getTimeStamp()} ❌ ${message}`));
  }

  debug(message: string): void {
    if (this.verbose) {
      console.log(chalk.gray(`${this.getTimeStamp()} 💭 ${message}`));
    }
  }
}
