import chalk from 'chalk';

export class Logger {
  constructor(private verbose: boolean = false) {}

  info(message: string): void {
    console.log(chalk.blue(`ℹ ${message}`));
  }

  success(message: string): void {
    if (this.verbose) {
      console.log(chalk.green(`✅ ${message}`));
    }
  }

  error(message: string): void {
    console.error(chalk.red(`❌ ${message}`));
  }

  warn(message: string): void {
    if (this.verbose) {
      console.warn(chalk.yellow(`⚠ ${message}`));
    }
  }

  debug(message: string): void {
    if (this.verbose) {
      console.log(chalk.gray(`🐛 ${message}`));
    }
  }
} 