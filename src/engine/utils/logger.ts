type Nullable<T> = T | undefined;

export interface LoggerConfig {
  enabled?: boolean;
  filename?: string;
}

export class Logger {
  private startTime: number = 0;
  private isEnabled: boolean;
  private logs: string[] = [];
  private filename: string;

  constructor(config: LoggerConfig = {}) {
    this.isEnabled = config.enabled ?? false;
    this.filename = config.filename ?? 'calculator-debug.log';
    this.startTime = Date.now();

    if (!this.isEnabled) return;

    this.log(`=== Log started at ${new Date().toISOString()} ===\n\n`);
  }

  log(message: string, data?: Nullable<any>): void {
    if (!this.isEnabled) return;

    const timestamp = Date.now() - this.startTime;
    let logMessage = `[${timestamp}ms] ${message}`;

    if (data !== undefined) {
      if (typeof data === 'object') {
        logMessage += `\n${JSON.stringify(data, null, 2)}`;
      } else {
        logMessage += ` ${data}`;
      }
    }

    this.logs.push(logMessage);

    // In Node.js, you can optionally write to fs
    if (typeof window === 'undefined') {
      // Node.js environment
      import('fs').then(fs => {
        import('path').then(path => {
          const logsDir = path.join(process.cwd(), 'logs');
          if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);
          const logFilePath = path.join(logsDir, this.filename);
          fs.appendFileSync(logFilePath, logMessage + '\n');
        });
      });
    } else {
      // Browser fallback: console.log
      console.log(logMessage);
    }
  }

  getLogs(): string[] {
    return this.logs;
  }
}

// Singleton
// VENDORED ADAPTATION (Zoning Studio): the upstream singleton ships with
// `enabled: true`, which buffers every log line in memory and mirrors it to
// the browser console — fine for a CLI library, but it would flood an
// interactive app that recalculates on every slider move. Disabled here;
// no engine logic is changed.
export const logger = new Logger({ enabled: false });
