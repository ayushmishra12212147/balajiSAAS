/**
 * Electron Preload Script
 *
 * Exposes a restricted, business-level API to the renderer process
 * via contextBridge. All IPC channel names are private implementation
 * details — the renderer only sees typed method calls.
 *
 * Security: contextIsolation = true, nodeIntegration = false, sandbox = true.
 */

import { contextBridge, ipcRenderer } from "electron";

// ── Internal IPC channel names (never exposed to renderer) ──────────────

const CHANNELS = {
  // App
  APP_GET_VERSION: "__hms_app_version",
  APP_GET_PLATFORM: "__hms_app_platform",
  APP_QUIT: "__hms_app_quit",

  // Database
  DB_TEST_CONNECTION: "__hms_db_test",
  DB_RUN_MIGRATIONS: "__hms_db_migrate",
  DB_RUN_SEED: "__hms_db_seed",

  // Config
  CONFIG_LOAD: "__hms_config_load",
  CONFIG_SAVE: "__hms_config_save",
  CONFIG_IS_FIRST_RUN: "__hms_config_first_run",

  // Backup
  BACKUP_CREATE: "__hms_backup_create",

  // Print
  PRINT_OPEN_DIALOG: "__hms_print_dialog",

  // Crash
  CRASH_GET_LOGS: "__hms_crash_logs",
  CRASH_EXPORT: "__hms_crash_export",

  // System
  SYSTEM_DIAGNOSTICS: "__hms_sys_diagnostics",
  SYSTEM_HEALTH: "__hms_sys_health",

  // Update
  UPDATE_CHECK: "__hms_update_check",
} as const;

// ── Exposed API ─────────────────────────────────────────────────────────

const electronAPI = {
  app: {
    getVersion: (): Promise<string> =>
      ipcRenderer.invoke(CHANNELS.APP_GET_VERSION),
    getPlatform: (): Promise<string> =>
      ipcRenderer.invoke(CHANNELS.APP_GET_PLATFORM),
    quit: (): void => {
      ipcRenderer.send(CHANNELS.APP_QUIT);
    },
  },

  database: {
    testConnection: (
      config: {
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
      }
    ): Promise<{ success: boolean; message: string }> =>
      ipcRenderer.invoke(CHANNELS.DB_TEST_CONNECTION, config),

    runMigrations: (): Promise<{ success: boolean; output: string }> =>
      ipcRenderer.invoke(CHANNELS.DB_RUN_MIGRATIONS),

    runSeed: (): Promise<{ success: boolean; output: string }> =>
      ipcRenderer.invoke(CHANNELS.DB_RUN_SEED),
  },

  config: {
    load: (): Promise<Record<string, unknown> | null> =>
      ipcRenderer.invoke(CHANNELS.CONFIG_LOAD),
    save: (config: Record<string, unknown>): Promise<void> =>
      ipcRenderer.invoke(CHANNELS.CONFIG_SAVE, config),
    isFirstRun: (): Promise<boolean> =>
      ipcRenderer.invoke(CHANNELS.CONFIG_IS_FIRST_RUN),
  },

  backup: {
    create: (
      type: "FULL" | "INCREMENTAL"
    ): Promise<{ filename: string }> =>
      ipcRenderer.invoke(CHANNELS.BACKUP_CREATE, type),
  },

  print: {
    openDialog: (): void => {
      ipcRenderer.send(CHANNELS.PRINT_OPEN_DIALOG);
    },
  },

  crash: {
    getLogs: (): Promise<
      Array<{
        filename: string;
        timestamp: string;
        processType: string;
        message: string;
      }>
    > => ipcRenderer.invoke(CHANNELS.CRASH_GET_LOGS),

    exportLogs: (targetPath: string): Promise<void> =>
      ipcRenderer.invoke(CHANNELS.CRASH_EXPORT, targetPath),
  },

  system: {
    getDiagnostics: (): Promise<Record<string, string>> =>
      ipcRenderer.invoke(CHANNELS.SYSTEM_DIAGNOSTICS),
    getHealth: (): Promise<{
      serverRunning: boolean;
      httpHealthy: boolean;
      dbHealthy: boolean;
    }> => ipcRenderer.invoke(CHANNELS.SYSTEM_HEALTH),
  },

  update: {
    check: (): Promise<{
      currentVersion: string;
      latestVersion: string;
      updateAvailable: boolean;
      releaseNotes?: string;
    }> => ipcRenderer.invoke(CHANNELS.UPDATE_CHECK),
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

// ── Type export for use in renderer (declaration merge) ─────────────────

export type ElectronAPI = typeof electronAPI;
