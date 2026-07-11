/**
 * Crash Handler & Log Rotation
 *
 * Captures renderer crashes, main process exceptions,
 * and server process crashes. Stores structured crash logs
 * and handles automatic log rotation (30 days / max size).
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { app, BrowserWindow } from "electron";

// ── Types ───────────────────────────────────────────────────────────────

export interface CrashLog {
  filename: string;
  timestamp: string;
  processType: "renderer" | "main" | "server";
  message: string;
  stack?: string;
  systemInfo: {
    platform: string;
    arch: string;
    nodeVersion: string;
    electronVersion: string;
    totalMemory: string;
    freeMemory: string;
  };
}

interface LogRotationConfig {
  maxAgeDays: number;
  maxSizeBytes: number;
}

// ── Default Rotation Config ─────────────────────────────────────────────

const DEFAULT_ROTATION: LogRotationConfig = {
  maxAgeDays: 30,
  maxSizeBytes: 100 * 1024 * 1024, // 100 MB
};

// ── Crash Handler ───────────────────────────────────────────────────────

export class CrashHandler {
  private logsDir: string;
  private rotationConfig: LogRotationConfig;

  constructor(rotationConfig?: Partial<LogRotationConfig>) {
    this.logsDir = path.join(app.getPath("userData"), "logs");
    this.rotationConfig = { ...DEFAULT_ROTATION, ...(rotationConfig || {}) };

    // Ensure logs directory exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Initialize all crash handlers.
   * Call this once during app startup.
   */
  initialize(): void {
    this.setupMainProcessHandlers();
    this.rotateLogsOnStartup();
    this.logEvent("app-startup", "HMS application started");
  }

  /**
   * Attach renderer crash handler to a BrowserWindow.
   */
  attachToWindow(window: BrowserWindow): void {
    window.webContents.on("render-process-gone", (_event, details) => {
      this.saveCrashLog({
        processType: "renderer",
        message: `Renderer process gone: ${details.reason}`,
        stack: `Exit code: ${details.exitCode}`,
      });
    });

    window.webContents.on("unresponsive", () => {
      this.logEvent("renderer-unresponsive", "Renderer became unresponsive");
    });

    window.webContents.on("responsive", () => {
      this.logEvent("renderer-responsive", "Renderer became responsive again");
    });
  }

  /**
   * Record a server crash event.
   */
  recordServerCrash(message: string, details?: string): void {
    this.saveCrashLog({
      processType: "server",
      message,
      stack: details,
    });
  }

  /**
   * Get all crash logs sorted by newest first.
   */
  getCrashLogs(): CrashLog[] {
    const logs: CrashLog[] = [];

    try {
      const files = fs.readdirSync(this.logsDir).filter((f) =>
        f.startsWith("crash-") && f.endsWith(".json")
      );

      for (const file of files) {
        try {
          const content = fs.readFileSync(
            path.join(this.logsDir, file),
            "utf8"
          );
          const parsed = JSON.parse(content) as CrashLog;
          parsed.filename = file;
          logs.push(parsed);
        } catch {
          // Skip corrupted log files
        }
      }
    } catch {
      // Directory read failed
    }

    return logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Export all logs to a ZIP-like directory at the target path.
   */
  exportLogs(targetDir: string): void {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const files = fs.readdirSync(this.logsDir);
    for (const file of files) {
      const src = path.join(this.logsDir, file);
      const dest = path.join(targetDir, file);
      fs.copyFileSync(src, dest);
    }
  }

  /**
   * Log a general application event to the daily log file.
   */
  logEvent(event: string, message: string): void {
    const timestamp = new Date().toISOString();
    const date = timestamp.split("T")[0];
    const logPath = path.join(this.logsDir, `app-${date}.log`);
    const line = `[${timestamp}] [${event}] ${message}\n`;

    try {
      fs.appendFileSync(logPath, line, "utf8");
    } catch {
      // Silently fail
    }
  }

  /**
   * Log application shutdown.
   */
  logShutdown(): void {
    this.logEvent("app-shutdown", "HMS application shutting down");
  }

  // ── Private Methods ─────────────────────────────────────────────────

  /**
   * Setup main process crash handlers.
   */
  private setupMainProcessHandlers(): void {
    process.on("uncaughtException", (error) => {
      this.saveCrashLog({
        processType: "main",
        message: `Uncaught Exception: ${error.message}`,
        stack: error.stack,
      });

      // Log but don't exit — let Electron handle graceful shutdown
      console.error("[CrashHandler] Uncaught Exception:", error);
    });

    process.on("unhandledRejection", (reason) => {
      const message =
        reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;

      this.saveCrashLog({
        processType: "main",
        message: `Unhandled Rejection: ${message}`,
        stack,
      });

      console.error("[CrashHandler] Unhandled Rejection:", reason);
    });
  }

  /**
   * Save a structured crash log to disk.
   */
  private saveCrashLog(params: {
    processType: "renderer" | "main" | "server";
    message: string;
    stack?: string;
  }): void {
    const timestamp = new Date().toISOString();
    const safeTimestamp = timestamp.replace(/[:.]/g, "-");
    const filename = `crash-${safeTimestamp}.json`;

    const crashLog: CrashLog = {
      filename,
      timestamp,
      processType: params.processType,
      message: params.message,
      stack: params.stack,
      systemInfo: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron || "unknown",
        totalMemory: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
        freeMemory: `${Math.round(os.freemem() / 1024 / 1024)} MB`,
      },
    };

    try {
      fs.writeFileSync(
        path.join(this.logsDir, filename),
        JSON.stringify(crashLog, null, 2),
        "utf8"
      );
    } catch {
      // Cannot save crash log — nothing we can do
    }

    // Also append to daily log
    this.logEvent(`crash-${params.processType}`, params.message);
  }

  /**
   * Rotate logs on startup: delete old files and enforce size limits.
   */
  private rotateLogsOnStartup(): void {
    try {
      const files = fs.readdirSync(this.logsDir);
      const now = Date.now();
      const maxAge = this.rotationConfig.maxAgeDays * 24 * 60 * 60 * 1000;

      // Collect file info
      const fileInfos = files
        .map((name) => {
          const filePath = path.join(this.logsDir, name);
          try {
            const stats = fs.statSync(filePath);
            return { name, path: filePath, mtime: stats.mtimeMs, size: stats.size };
          } catch {
            return null;
          }
        })
        .filter((f): f is NonNullable<typeof f> => f !== null);

      // Delete files older than maxAgeDays
      for (const file of fileInfos) {
        if (now - file.mtime > maxAge) {
          try {
            fs.unlinkSync(file.path);
          } catch {
            // Skip
          }
        }
      }

      // Enforce max total size — delete oldest files first
      const remainingFiles = fileInfos
        .filter((f) => fs.existsSync(f.path))
        .sort((a, b) => a.mtime - b.mtime); // oldest first

      let totalSize = remainingFiles.reduce((sum, f) => sum + f.size, 0);

      for (const file of remainingFiles) {
        if (totalSize <= this.rotationConfig.maxSizeBytes) break;
        try {
          fs.unlinkSync(file.path);
          totalSize -= file.size;
        } catch {
          // Skip
        }
      }

      this.logEvent(
        "log-rotation",
        `Log rotation complete. ${remainingFiles.length} files, ${Math.round(totalSize / 1024)} KB total.`
      );
    } catch {
      // Rotation failed silently
    }
  }
}
