/**
 * IPC Handlers
 *
 * Registers all ipcMain.handle listeners for the Electron main process.
 * Each handler validates arguments before executing and delegates
 * to the appropriate service.
 *
 * Channel names are internal constants matching preload.ts.
 * Renderer code never sees these — only the business-level API.
 */

import { ipcMain, BrowserWindow, dialog, app } from "electron";
import { ConfigManager, HMSConfig } from "./config-manager";
import { ServerManager } from "./server-manager";
import { CrashHandler } from "./crash-handler";
import { DeploymentToolkit } from "./deployment-toolkit";
import { createUpdateProvider } from "./auto-updater";

// ── Internal Channel Constants (must match preload.ts) ──────────────────

const CHANNELS = {
  APP_GET_VERSION: "__hms_app_version",
  APP_GET_PLATFORM: "__hms_app_platform",
  APP_QUIT: "__hms_app_quit",

  DB_TEST_CONNECTION: "__hms_db_test",
  DB_RUN_MIGRATIONS: "__hms_db_migrate",
  DB_RUN_SEED: "__hms_db_seed",

  CONFIG_LOAD: "__hms_config_load",
  CONFIG_SAVE: "__hms_config_save",
  CONFIG_IS_FIRST_RUN: "__hms_config_first_run",

  BACKUP_CREATE: "__hms_backup_create",

  PRINT_OPEN_DIALOG: "__hms_print_dialog",

  CRASH_GET_LOGS: "__hms_crash_logs",
  CRASH_EXPORT: "__hms_crash_export",

  SYSTEM_DIAGNOSTICS: "__hms_sys_diagnostics",
  SYSTEM_HEALTH: "__hms_sys_health",

  UPDATE_CHECK: "__hms_update_check",
} as const;

// ── Register All Handlers ───────────────────────────────────────────────

export function registerIpcHandlers(
  configManager: ConfigManager,
  serverManager: ServerManager,
  crashHandler: CrashHandler,
  toolkit: DeploymentToolkit
): void {
  const updateProvider = createUpdateProvider();

  // ── App ───────────────────────────────────────────────────────────

  ipcMain.handle(CHANNELS.APP_GET_VERSION, () => {
    return app.getVersion();
  });

  ipcMain.handle(CHANNELS.APP_GET_PLATFORM, () => {
    return process.platform;
  });

  ipcMain.on(CHANNELS.APP_QUIT, () => {
    app.quit();
  });

  // ── Database ──────────────────────────────────────────────────────

  ipcMain.handle(
    CHANNELS.DB_TEST_CONNECTION,
    async (
      _event,
      config: { host: string; port: number; username: string; password: string; database: string }
    ) => {
      // Validate arguments
      if (
        !config ||
        typeof config.host !== "string" ||
        typeof config.port !== "number" ||
        typeof config.username !== "string" ||
        typeof config.password !== "string" ||
        typeof config.database !== "string"
      ) {
        return { success: false, message: "Invalid database configuration parameters" };
      }

      return toolkit.testDatabaseConnection(config);
    }
  );

  ipcMain.handle(CHANNELS.DB_RUN_MIGRATIONS, async () => {
    return toolkit.runMigrations();
  });

  ipcMain.handle(CHANNELS.DB_RUN_SEED, async () => {
    return toolkit.runSeed();
  });

  // ── Config ────────────────────────────────────────────────────────

  ipcMain.handle(CHANNELS.CONFIG_LOAD, () => {
    try {
      return configManager.loadConfig();
    } catch {
      return null;
    }
  });

  ipcMain.handle(CHANNELS.CONFIG_SAVE, (_event, config: HMSConfig) => {
    if (!config || typeof config !== "object") {
      throw new Error("Invalid configuration data");
    }
    configManager.saveConfig(config);
  });

  ipcMain.handle(CHANNELS.CONFIG_IS_FIRST_RUN, () => {
    return !configManager.isSetupComplete();
  });

  // ── Backup ────────────────────────────────────────────────────────

  ipcMain.handle(
    CHANNELS.BACKUP_CREATE,
    async (_event, type: "FULL" | "INCREMENTAL") => {
      if (type !== "FULL" && type !== "INCREMENTAL") {
        throw new Error("Invalid backup type. Must be FULL or INCREMENTAL.");
      }

      // Delegate to HMS API via HTTP (Electron never imports business modules)
      const port = serverManager.getPort();
      if (!port || !serverManager.getIsRunning()) {
        throw new Error("HMS server is not running");
      }

      const http = require("http") as typeof import("http");
      return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ type });
        const req = http.request(
          {
            hostname: "127.0.0.1",
            port,
            path: "/api/admin/backups",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(postData),
            },
            timeout: 60000,
          },
          (res) => {
            let body = "";
            res.on("data", (chunk: Buffer) => { body += chunk.toString(); });
            res.on("end", () => {
              try {
                resolve(JSON.parse(body));
              } catch {
                reject(new Error("Invalid response from backup API"));
              }
            });
          }
        );
        req.on("error", reject);
        req.write(postData);
        req.end();
      });
    }
  );

  // ── Print ─────────────────────────────────────────────────────────

  ipcMain.on(CHANNELS.PRINT_OPEN_DIALOG, (event) => {
    // Only invoke native print dialog — no layout generation
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.webContents.print({ silent: false, printBackground: true });
    }
  });

  // ── Crash ─────────────────────────────────────────────────────────

  ipcMain.handle(CHANNELS.CRASH_GET_LOGS, () => {
    return crashHandler.getCrashLogs();
  });

  ipcMain.handle(CHANNELS.CRASH_EXPORT, async (_event, targetPath: string) => {
    if (!targetPath || typeof targetPath !== "string") {
      // Open dialog to pick export location
      const result = await dialog.showOpenDialog({
        properties: ["openDirectory", "createDirectory"],
        title: "Export Crash Logs",
      });

      if (result.canceled || result.filePaths.length === 0) {
        throw new Error("Export cancelled");
      }

      targetPath = result.filePaths[0];
    }

    crashHandler.exportLogs(targetPath);
  });

  // ── System ────────────────────────────────────────────────────────

  ipcMain.handle(CHANNELS.SYSTEM_DIAGNOSTICS, async () => {
    return toolkit.getEnvironmentReport();
  });

  ipcMain.handle(CHANNELS.SYSTEM_HEALTH, async () => {
    return serverManager.checkHealth();
  });

  // ── Update ────────────────────────────────────────────────────────

  ipcMain.handle(CHANNELS.UPDATE_CHECK, async () => {
    return updateProvider.checkForUpdates();
  });
}
