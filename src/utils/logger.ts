import { Platform } from 'react-native';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

class Logger {
  private log(level: LogLevel, message: string, data?: unknown): void {
    if (!__DEV__) return;
    const prefix = `[Planora ${level}]`;
    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
    if (Platform.OS === 'web') {
      /* noop */
    }
  }

  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }
  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }
  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }
  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }
}

export const logger = new Logger();
