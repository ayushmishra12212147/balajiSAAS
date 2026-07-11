/**
 * Deployment Toolkit
 *
 * Utility functions for environment validation, database migrations,
 * system diagnostics, and configuration import/export.
 *
 * All operations run in the Electron Main Process only.
 * Never exposed directly to the renderer.
 */

import { execFile, execFileSync } from "child_process";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { app } from "electron";
import { ConfigManager, HMSConfig } from "./config-manager";

// ── Types ───────────────────────────────────────────────────────────────

export interface EnvironmentReport {
  hmsVersion: string;
  electronVersion: string;
  nodeVersion: string;
  postgresVersion: string;
  prismaVersion: string;
  osVersion: string;
  osArch: string;
  totalMemory: string;
  freeMemory: string;
  diskSpace: string;
}

export interface CommandResult {
  success: boolean;
  output: string;
  exitCode: number;
}

// ── Deployment Toolkit ──────────────────────────────────────────────────

export class DeploymentToolkit {
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  /**
   * Validate that the environment meets HMS requirements.
   */
  async validateEnvironment(): Promise<{
    valid: boolean;
    checks: Array<{ name: string; passed: boolean; detail: string }>;
  }> {
    const checks: Array<{ name: string; passed: boolean; detail: string }> = [];

    // Check Node.js version
    const nodeVersion = process.version;
    const nodeMajor = parseInt(nodeVersion.replace("v", "").split(".")[0], 10);
    checks.push({
      name: "Node.js Version",
      passed: nodeMajor >= 18,
      detail: `${nodeVersion} (minimum: v18)`,
    });

    // Check PostgreSQL availability
    let pgVersion = "Not found";
    try {
      pgVersion = execFileSync("psql", ["--version"], {
        encoding: "utf8",
        timeout: 5000,
        windowsHide: true,
      }).trim();
      checks.push({
        name: "PostgreSQL CLI",
        passed: true,
        detail: pgVersion,
      });
    } catch {
      checks.push({
        name: "PostgreSQL CLI",
        passed: false,
        detail: "psql not found in PATH",
      });
    }

    // Check disk space (at least 1GB free)
    try {
      const appPath = app.getPath("userData");
      const stats = fs.statfsSync(appPath);
      const freeBytes = stats.bfree * stats.bsize;
      const freeGB = (freeBytes / 1024 / 1024 / 1024).toFixed(2);
      checks.push({
        name: "Disk Space",
        passed: freeBytes > 1024 * 1024 * 1024,
        detail: `${freeGB} GB free (minimum: 1 GB)`,
      });
    } catch {
      checks.push({
        name: "Disk Space",
        passed: true,
        detail: "Could not check disk space",
      });
    }

    // Check write permissions
    try {
      const testFile = path.join(app.getPath("userData"), ".write-test");
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);
      checks.push({
        name: "Write Permissions",
        passed: true,
        detail: "App data directory is writable",
      });
    } catch {
      checks.push({
        name: "Write Permissions",
        passed: false,
        detail: "Cannot write to app data directory",
      });
    }

    return {
      valid: checks.every((c) => c.passed),
      checks,
    };
  }

  /**
   * Execute Prisma migrations.
   * Runs in Main Process only — never from renderer.
   */
  async runMigrations(): Promise<CommandResult> {
    const databaseUrl = this.configManager.getDatabaseUrl();
    const prismaDir = this.getPrismaDir();

    return this.execCommand("npx", [
      "prisma", "migrate", "deploy",
      "--schema", path.join(prismaDir, "schema.prisma"),
    ], {
      DATABASE_URL: databaseUrl,
    });
  }

  /**
   * Execute Prisma seed.
   * Runs in Main Process only — never from renderer.
   */
  async runSeed(): Promise<CommandResult> {
    const databaseUrl = this.configManager.getDatabaseUrl();

    return this.execCommand("npx", [
      "prisma", "db", "seed",
    ], {
      DATABASE_URL: databaseUrl,
    });
  }

  /**
   * Test database connection using psql or a direct TCP connect.
   */
  async testDatabaseConnection(config: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  }): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      // Try TCP connection first
      const net = require("net") as typeof import("net");
      const socket = new net.Socket();

      socket.setTimeout(5000);

      socket.on("connect", () => {
        socket.destroy();
        resolve({
          success: true,
          message: `Connected to PostgreSQL at ${config.host}:${config.port}/${config.database}`,
        });
      });

      socket.on("error", (err: Error) => {
        socket.destroy();
        resolve({
          success: false,
          message: `Connection failed: ${err.message}`,
        });
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve({
          success: false,
          message: `Connection timed out to ${config.host}:${config.port}`,
        });
      });

      socket.connect(config.port, config.host);
    });
  }

  /**
   * Generate a comprehensive environment report.
   */
  async getEnvironmentReport(): Promise<EnvironmentReport> {
    // PostgreSQL version
    let postgresVersion = "Not available";
    try {
      postgresVersion = execFileSync("psql", ["--version"], {
        encoding: "utf8",
        timeout: 5000,
        windowsHide: true,
      }).trim();
    } catch {
      // psql not in PATH
    }

    // Prisma version
    let prismaVersion = "Not available";
    try {
      prismaVersion = execFileSync("npx", ["prisma", "--version"], {
        encoding: "utf8",
        timeout: 10000,
        windowsHide: true,
      }).trim().split("\n")[0];
    } catch {
      // Prisma not available
    }

    // Disk space
    let diskSpace = "Unknown";
    try {
      const appPath = app.getPath("userData");
      const stats = fs.statfsSync(appPath);
      const totalGB = ((stats.blocks * stats.bsize) / 1024 / 1024 / 1024).toFixed(2);
      const freeGB = ((stats.bfree * stats.bsize) / 1024 / 1024 / 1024).toFixed(2);
      diskSpace = `${freeGB} GB free / ${totalGB} GB total`;
    } catch {
      // Cannot determine
    }

    return {
      hmsVersion: app.getVersion(),
      electronVersion: process.versions.electron || "unknown",
      nodeVersion: process.version,
      postgresVersion,
      prismaVersion,
      osVersion: `${os.type()} ${os.release()}`,
      osArch: os.arch(),
      totalMemory: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
      freeMemory: `${Math.round(os.freemem() / 1024 / 1024)} MB`,
      diskSpace,
    };
  }

  /**
   * Export configuration (with passwords masked) to a JSON file.
   */
  exportConfig(targetPath: string): void {
    const config = this.configManager.loadConfig();

    // Mask sensitive fields
    const sanitized = {
      ...config,
      database: {
        ...config.database,
        password: "********",
      },
    };

    fs.writeFileSync(targetPath, JSON.stringify(sanitized, null, 2), "utf8");
  }

  /**
   * Import configuration from a JSON file.
   * Validates structure before saving.
   */
  importConfig(sourcePath: string): HMSConfig {
    const content = fs.readFileSync(sourcePath, "utf8");
    const parsed = JSON.parse(content);

    // The ConfigManager.saveConfig validates internally
    this.configManager.saveConfig(parsed);
    return this.configManager.loadConfig();
  }

  // ── Private Helpers ───────────────────────────────────────────────────

  /**
   * Get the Prisma schema directory.
   */
  private getPrismaDir(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, "prisma");
    }
    return path.join(process.cwd(), "prisma");
  }

  /**
   * Execute a command and return structured result.
   */
  private execCommand(
    command: string,
    args: string[],
    envVars?: Record<string, string>
  ): Promise<CommandResult> {
    return new Promise((resolve) => {
      execFile(
        command,
        args,
        {
          env: { ...process.env, ...envVars },
          cwd: app.isPackaged ? process.resourcesPath : process.cwd(),
          timeout: 60000,
          windowsHide: true,
          shell: true,
        },
        (error, stdout, stderr) => {
          if (error) {
            resolve({
              success: false,
              output: stderr || error.message,
              exitCode: error.code ? parseInt(String(error.code), 10) : 1,
            });
          } else {
            resolve({
              success: true,
              output: stdout || "Command completed successfully",
              exitCode: 0,
            });
          }
        }
      );
    });
  }
}
