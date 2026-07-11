import fs from "fs";
import path from "path";

const LOGS_DIR = path.join(process.cwd(), "logs");

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create logs directory", err);
  }
}

class BaseLogger {
  private filename: string;
  private logType: string;

  constructor(logType: string) {
    this.logType = logType;
    this.filename = path.join(LOGS_DIR, `${logType}.log`);
  }

  private write(level: string, message: string, metadata: Record<string, unknown> | null = null) {
    const timestamp = new Date().toISOString();
    const logObject = {
      timestamp,
      level,
      type: this.logType,
      message,
      metadata,
    };

    const logLine = JSON.stringify(logObject) + "\n";

    try {
      fs.appendFileSync(this.filename, logLine);
    } catch (err) {
      console.error(`Failed to write to log file: ${this.filename}`, err);
    }

    // Console output for development
    if (process.env.NODE_ENV !== "production") {
      const colorMap: Record<string, string> = {
        INFO: "\x1b[32m",  // Green
        WARN: "\x1b[33m",  // Yellow
        ERROR: "\x1b[31m", // Red
        AUDIT: "\x1b[36m", // Cyan
      };
      const color = colorMap[level] || "\x1b[37m";
      const reset = "\x1b[0m";
      console.log(
        `[${timestamp}] ${color}${level.padEnd(5)}${reset} [${this.logType.toUpperCase()}] ${message} ${
          metadata ? JSON.stringify(metadata) : ""
        }`
      );
    }
  }

  public info(message: string, metadata: Record<string, unknown> | null = null) {
    this.write("INFO", message, metadata);
  }

  public warn(message: string, metadata: Record<string, unknown> | null = null) {
    this.write("WARN", message, metadata);
  }

  public error(message: string, metadata: Record<string, unknown> | null = null) {
    this.write("ERROR", message, metadata);
  }

  public audit(message: string, metadata: Record<string, unknown> | null = null) {
    this.write("AUDIT", message, metadata);
  }
}

export const applicationLogger = new BaseLogger("application");
export const databaseLogger = new BaseLogger("database");
export const securityLogger = new BaseLogger("security");
export const auditLogger = new BaseLogger("audit");
export const dbLogger = databaseLogger; // Alias for convenience
export const appLogger = applicationLogger; // Alias for convenience
