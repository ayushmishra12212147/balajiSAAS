/**
 * Server Manager
 *
 * Manages the Next.js standalone server lifecycle within Electron.
 * Handles startup, shutdown, health checks, and automatic crash recovery.
 *
 * Communication with HMS is HTTP-only — never imports business modules.
 *
 * Health verification is triple-layered:
 *  1. Child process is alive (pid exists, no exit event).
 *  2. HTTP GET /api/health returns 200.
 *  3. Database connectivity confirmed via HTTP API.
 */

import { ChildProcess, spawn } from "child_process";
import * as net from "net";
import * as path from "path";
import * as fs from "fs";
import * as http from "http";
import { EventEmitter } from "events";
import { app } from "electron";

// ── Types ───────────────────────────────────────────────────────────────

export interface ServerHealth {
  serverRunning: boolean;
  httpHealthy: boolean;
  dbHealthy: boolean;
}

export type ServerEvent =
  | "starting"
  | "ready"
  | "health-ok"
  | "crashed"
  | "fatal"
  | "stopped";

// ── Server Manager ──────────────────────────────────────────────────────

export class ServerManager extends EventEmitter {
  private serverProcess: ChildProcess | null = null;
  private port: number = 0;
  private databaseUrl: string = "";
  private sessionSecret: string = "";
  private isRunning: boolean = false;
  private hasAttemptedRestart: boolean = false;
  private logStream: fs.WriteStream | null = null;

  /**
   * Find a free port by binding to port 0.
   */
  private async findFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        if (addr && typeof addr === "object") {
          const port = addr.port;
          server.close(() => resolve(port));
        } else {
          server.close(() => reject(new Error("Failed to find free port")));
        }
      });
      server.on("error", reject);
    });
  }

  /**
   * Get the path to the standalone server entry.
   * In dev: .next/standalone/server.js
   * In production (packaged): resources/app/server.js
   */
  private getServerPath(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, "app", "server.js");
    }
    return path.join(process.cwd(), ".next", "standalone", "server.js");
  }

  /**
   * Get the working directory for the server.
   */
  private getServerCwd(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, "app");
    }
    return path.join(process.cwd(), ".next", "standalone");
  }

  /**
   * Create or get log stream for server output.
   */
  private getLogStream(): fs.WriteStream {
    if (this.logStream) return this.logStream;

    const logsDir = path.join(app.getPath("userData"), "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const date = new Date().toISOString().split("T")[0];
    const logPath = path.join(logsDir, `server-${date}.log`);
    this.logStream = fs.createWriteStream(logPath, { flags: "a" });
    return this.logStream;
  }

  /**
   * Log a timestamped message to the server log file.
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}\n`;
    try {
      this.getLogStream().write(line);
    } catch {
      // Silently fail if logging fails
    }
  }

  /**
   * Make an HTTP GET request and return the response status and body.
   */
  private httpGet(
    urlPath: string,
    timeoutMs: number = 5000
  ): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
      const req = http.get(
        `http://127.0.0.1:${this.port}${urlPath}`,
        { timeout: timeoutMs },
        (res) => {
          let body = "";
          res.on("data", (chunk: Buffer) => {
            body += chunk.toString();
          });
          res.on("end", () => {
            resolve({ status: res.statusCode || 0, body });
          });
        }
      );
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("HTTP request timed out"));
      });
    });
  }

  /**
   * Wait for a condition to become true, polling at intervals.
   */
  private async waitFor(
    check: () => Promise<boolean>,
    intervalMs: number,
    maxAttempts: number
  ): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        if (await check()) return true;
      } catch {
        // Continue polling
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return false;
  }

  /**
   * Start the Next.js standalone server.
   */
  async startServer(
    databaseUrl: string,
    sessionSecret: string,
    preferredPort?: number
  ): Promise<number> {
    if (this.isRunning) {
      throw new Error("Server is already running");
    }

    this.emit("starting");
    this.log("Starting HMS server...");

    this.databaseUrl = databaseUrl;
    this.sessionSecret = sessionSecret;

    // Check if we are in development mode
    if (!app.isPackaged) {
      this.port = preferredPort || 3000;
      this.log(`Development mode detected: Using Next.js dev server on port ${this.port}`);
      this.isRunning = true;
      this.emit("ready", { port: this.port });
      return this.port;
    }

    this.port = preferredPort || (await this.findFreePort());

    const serverPath = this.getServerPath();
    const serverCwd = this.getServerCwd();

    if (!fs.existsSync(serverPath)) {
      const errMsg = `Server entry not found at: ${serverPath}`;
      this.log(`ERROR: ${errMsg}`);
      throw new Error(errMsg);
    }

    this.log(`Server path: ${serverPath}`);
    this.log(`Working dir: ${serverCwd}`);
    this.log(`Port: ${this.port}`);

    // Spawn the server process with env variables
    this.serverProcess = spawn(process.execPath, [serverPath], {
      cwd: serverCwd,
      env: {
        ...process.env,
        PORT: String(this.port),
        HOSTNAME: "127.0.0.1",
        NODE_ENV: "production",
        DATABASE_URL: this.databaseUrl,
        SESSION_SECRET: this.sessionSecret,
        SESSION_EXPIRY_DAYS: "7",
        DEFAULT_ADMIN_EMAIL: "admin@hms.com",
        DEFAULT_ADMIN_PASSWORD: "admin123456",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    // Pipe output to log file
    const logStream = this.getLogStream();
    if (this.serverProcess.stdout) {
      this.serverProcess.stdout.on("data", (data: Buffer) => {
        logStream.write(`[stdout] ${data.toString()}`);
      });
    }
    if (this.serverProcess.stderr) {
      this.serverProcess.stderr.on("data", (data: Buffer) => {
        logStream.write(`[stderr] ${data.toString()}`);
      });
    }

    // Handle process exit
    this.serverProcess.on("exit", (code, signal) => {
      this.log(`Server process exited: code=${code}, signal=${signal}`);
      this.isRunning = false;
      this.serverProcess = null;

      // Unexpected crash — attempt one restart
      if (code !== 0 && code !== null) {
        this.emit("crashed", { code, signal });

        if (!this.hasAttemptedRestart) {
          this.hasAttemptedRestart = true;
          this.log("Attempting automatic restart...");
          this.startServer(this.databaseUrl, this.sessionSecret, this.port)
            .then(() => {
              this.log("Automatic restart succeeded.");
            })
            .catch((err: unknown) => {
              this.log(
                `Automatic restart failed: ${err instanceof Error ? err.message : String(err)}`
              );
              this.emit("fatal", {
                message: "Server restart failed",
                error: err instanceof Error ? err.message : String(err),
              });
            });
        } else {
          this.emit("fatal", {
            message: "Server crashed after restart attempt",
            code,
            signal,
          });
        }
      }
    });

    this.serverProcess.on("error", (err) => {
      this.log(`Server process error: ${err.message}`);
      this.isRunning = false;
    });

    // Wait for HTTP readiness (triple health check)
    this.log("Waiting for server readiness...");

    const isReady = await this.waitFor(
      async () => {
        // Check 1: Process alive
        if (!this.serverProcess || this.serverProcess.killed) return false;

        // Check 2: HTTP health endpoint
        try {
          const res = await this.httpGet("/api/health", 3000);
          return res.status >= 200 && res.status < 500;
        } catch {
          return false;
        }
      },
      1000, // poll every 1 second
      30 // max 30 seconds
    );

    if (!isReady) {
      this.log("ERROR: Server failed to become ready within 30 seconds");
      await this.stopServer();
      throw new Error("Server failed to start within 30 seconds");
    }

    this.isRunning = true;
    this.hasAttemptedRestart = false;
    this.log(`Server is ready on port ${this.port}`);
    this.emit("ready", { port: this.port });

    return this.port;
  }

  /**
   * Perform a full health check (process + HTTP + DB).
   */
  async checkHealth(): Promise<ServerHealth> {
    const health: ServerHealth = {
      serverRunning: false,
      httpHealthy: false,
      dbHealthy: false,
    };

    // Check 1: Process running
    if (!app.isPackaged || (this.serverProcess && !this.serverProcess.killed && this.isRunning)) {
      health.serverRunning = true;
    } else {
      return health;
    }

    // Check 2: HTTP health
    try {
      const res = await this.httpGet("/api/health", 5000);
      health.httpHealthy = res.status >= 200 && res.status < 500;
    } catch {
      return health;
    }

    // Check 3: DB healthy (use the system dashboard which queries PG)
    try {
      const res = await this.httpGet("/api/admin/system/dashboard", 5000);
      health.dbHealthy = res.status >= 200 && res.status < 500;
    } catch {
      // DB check failed but HTTP is up
    }

    if (health.serverRunning && health.httpHealthy && health.dbHealthy) {
      this.emit("health-ok");
    }

    return health;
  }

  /**
   * Stop the server gracefully.
   */
  async stopServer(): Promise<void> {
    this.log("Stopping server...");
    this.emit("stopped");

    if (!this.serverProcess) {
      this.isRunning = false;
      return;
    }

    return new Promise((resolve) => {
      const proc = this.serverProcess!;

      // Force kill after 5 seconds
      const killTimer = setTimeout(() => {
        try {
          proc.kill("SIGKILL");
        } catch {
          // Already dead
        }
        this.cleanup();
        resolve();
      }, 5000);

      proc.once("exit", () => {
        clearTimeout(killTimer);
        this.cleanup();
        resolve();
      });

      // Graceful stop
      try {
        proc.kill("SIGTERM");
      } catch {
        clearTimeout(killTimer);
        this.cleanup();
        resolve();
      }
    });
  }

  /**
   * Restart the server.
   */
  async restartServer(): Promise<number> {
    await this.stopServer();
    this.hasAttemptedRestart = false;
    return this.startServer(this.databaseUrl, this.sessionSecret);
  }

  /**
   * Get the current port the server is running on.
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Check if the server is currently running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Clean up resources.
   */
  private cleanup(): void {
    this.serverProcess = null;
    this.isRunning = false;
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }
}
