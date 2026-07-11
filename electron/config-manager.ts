/**
 * Configuration Manager
 *
 * Reads and writes the HMS configuration file (hms-config.enc)
 * using the platform-appropriate SecureStorage (DPAPI on Windows).
 *
 * All database credentials are encrypted at rest.
 * Config is validated against a strict schema before use.
 */

import * as fs from "fs";
import * as path from "path";
import { app } from "electron";
import { createSecureStorage, SecureStorage } from "./secure-storage";

// ── Config Interface ────────────────────────────────────────────────────

export interface HMSConfig {
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  hospital: {
    name: string;
    setupComplete: boolean;
  };
  server: {
    port: number;
  };
  app: {
    version: string;
    lastStartup: string;
  };
}

// ── Default Config ──────────────────────────────────────────────────────

const DEFAULT_CONFIG: HMSConfig = {
  database: {
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "",
    database: "hms",
  },
  hospital: {
    name: "Balaji Hospital",
    setupComplete: true,
  },
  server: {
    port: 0, // 0 = auto-assign free port
  },
  app: {
    version: "2.0.0",
    lastStartup: "",
  },
};

// ── Config Manager ──────────────────────────────────────────────────────

export class ConfigManager {
  private storage: SecureStorage;
  private configPath: string;
  private cachedConfig: HMSConfig | null = null;

  constructor() {
    this.storage = createSecureStorage();
    this.configPath = path.join(app.getPath("userData"), "hms-config.enc");
  }

  /**
   * Check if the config file exists on disk.
   */
  hasConfig(): boolean {
    return fs.existsSync(this.configPath);
  }

  /**
   * Check if first-run setup has been completed.
   */
  isSetupComplete(): boolean {
    return true; // Bypass first-run setup wizard completely for Shreeganesha Hospital single instance
  }

  /**
   * Load, decrypt, and validate the config file.
   * Returns cached version if available.
   */
  loadConfig(): HMSConfig {
    if (this.cachedConfig) return this.cachedConfig;

    if (!this.hasConfig()) {
      return { ...DEFAULT_CONFIG };
    }

    try {
      const encrypted = fs.readFileSync(this.configPath);
      const decrypted = this.storage.decrypt(encrypted);
      const parsed = JSON.parse(decrypted.toString("utf8"));

      const config = this.validateConfig(parsed);
      this.cachedConfig = config;
      return config;
    } catch (err: unknown) {
      console.error(
        "[ConfigManager] Failed to load config:",
        err instanceof Error ? err.message : String(err)
      );
      // Return defaults if config is corrupted
      return { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Save the config to disk (encrypted).
   */
  saveConfig(config: HMSConfig): void {
    const validated = this.validateConfig(config);
    const json = JSON.stringify(validated, null, 2);
    const data = Buffer.from(json, "utf8");
    const encrypted = this.storage.encrypt(data);

    // Ensure directory exists
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.configPath, encrypted);
    this.cachedConfig = validated;
  }

  /**
   * Update specific fields in the config and save.
   */
  updateConfig(partial: Partial<HMSConfig>): HMSConfig {
    const current = this.loadConfig();
    const merged: HMSConfig = {
      database: { ...current.database, ...(partial.database || {}) },
      hospital: { ...current.hospital, ...(partial.hospital || {}) },
      server: { ...current.server, ...(partial.server || {}) },
      app: { ...current.app, ...(partial.app || {}) },
    };
    this.saveConfig(merged);
    return merged;
  }

  /**
   * Delete the config file and clear cache.
   */
  resetConfig(): void {
    if (fs.existsSync(this.configPath)) {
      fs.unlinkSync(this.configPath);
    }
    this.cachedConfig = null;
  }

  /**
   * Build a PostgreSQL DATABASE_URL from config.
   */
  getDatabaseUrl(): string {
    const db = this.loadConfig().database;
    return `postgresql://${encodeURIComponent(db.username)}:${encodeURIComponent(db.password)}@${db.host}:${db.port}/${db.database}?schema=public`;
  }

  /**
   * Validate config structure. Fill missing fields with defaults.
   */
  private validateConfig(raw: unknown): HMSConfig {
    if (!raw || typeof raw !== "object") {
      return { ...DEFAULT_CONFIG };
    }

    const obj = raw as Record<string, unknown>;

    const db = (obj.database || {}) as Record<string, unknown>;
    const hospital = (obj.hospital || {}) as Record<string, unknown>;
    const server = (obj.server || {}) as Record<string, unknown>;
    const appCfg = (obj.app || {}) as Record<string, unknown>;

    return {
      database: {
        host: typeof db.host === "string" ? db.host : DEFAULT_CONFIG.database.host,
        port: typeof db.port === "number" ? db.port : DEFAULT_CONFIG.database.port,
        username: typeof db.username === "string" ? db.username : DEFAULT_CONFIG.database.username,
        password: typeof db.password === "string" ? db.password : DEFAULT_CONFIG.database.password,
        database: typeof db.database === "string" ? db.database : DEFAULT_CONFIG.database.database,
      },
      hospital: {
        name: typeof hospital.name === "string" ? hospital.name : DEFAULT_CONFIG.hospital.name,
        setupComplete: typeof hospital.setupComplete === "boolean" ? hospital.setupComplete : DEFAULT_CONFIG.hospital.setupComplete,
      },
      server: {
        port: typeof server.port === "number" ? server.port : DEFAULT_CONFIG.server.port,
      },
      app: {
        version: typeof appCfg.version === "string" ? appCfg.version : DEFAULT_CONFIG.app.version,
        lastStartup: typeof appCfg.lastStartup === "string" ? appCfg.lastStartup : DEFAULT_CONFIG.app.lastStartup,
      },
    };
  }
}
