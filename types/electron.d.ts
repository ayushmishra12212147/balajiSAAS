/**
 * Electron API Type Declarations
 *
 * Shared type definitions for the electronAPI exposed by the Electron preload script.
 * This file is used by Next.js pages that interact with Electron IPC.
 */

export interface ElectronAPI {
  app: {
    getVersion(): Promise<string>;
    getPlatform(): Promise<string>;
    quit(): void;
  };
  database: {
    testConnection(config: {
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
    }): Promise<{ success: boolean; message: string }>;
    runMigrations(): Promise<{ success: boolean; output: string }>;
    runSeed(): Promise<{ success: boolean; output: string }>;
  };
  config: {
    load(): Promise<Record<string, unknown> | null>;
    save(config: Record<string, unknown>): Promise<void>;
    isFirstRun(): Promise<boolean>;
  };
  backup: {
    create(type: "FULL" | "INCREMENTAL"): Promise<{ filename: string }>;
  };
  print: {
    openDialog(): void;
  };
  crash: {
    getLogs(): Promise<
      Array<{
        filename: string;
        timestamp: string;
        processType: string;
        message: string;
      }>
    >;
    exportLogs(targetPath: string): Promise<void>;
  };
  system: {
    getDiagnostics(): Promise<Record<string, string>>;
    getHealth(): Promise<{
      serverRunning: boolean;
      httpHealthy: boolean;
      dbHealthy: boolean;
    }>;
  };
  update: {
    check(): Promise<{
      currentVersion: string;
      latestVersion: string;
      updateAvailable: boolean;
      releaseNotes?: string;
    }>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
