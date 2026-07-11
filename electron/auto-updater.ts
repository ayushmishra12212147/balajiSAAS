/**
 * Auto Updater — Abstract Interface
 *
 * NOT bound to electron-updater.
 * Future implementations may use offline, USB, LAN, or internet updates
 * without changing application architecture.
 */

import * as fs from "fs";
import * as path from "path";
import { app } from "electron";

// ── Interfaces ──────────────────────────────────────────────────────────

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseNotes?: string;
  channel: "stable" | "beta";
}

/**
 * Abstract update provider interface.
 * Implementations: LocalUpdateProvider, USBUpdateProvider,
 * LANUpdateProvider, InternetUpdateProvider.
 */
export interface UpdateProvider {
  checkForUpdates(): Promise<UpdateInfo>;
  downloadUpdate(info: UpdateInfo): Promise<string>;
  applyUpdate(filePath: string): Promise<void>;
  rollback(): Promise<void>;
}

// ── Local Update Provider ───────────────────────────────────────────────

interface UpdateManifest {
  version: string;
  channel: "stable" | "beta";
  releaseNotes?: string;
  filename?: string;
}

/**
 * Checks a local update-manifest.json file for available updates.
 * This is the default implementation for offline/manual updates.
 *
 * To deploy an update:
 * 1. Place the new installer and update-manifest.json in the updates directory.
 * 2. The app will detect the new version on next check.
 */
export class LocalUpdateProvider implements UpdateProvider {
  private updatesDir: string;
  private manifestPath: string;

  constructor() {
    this.updatesDir = path.join(app.getPath("userData"), "updates");
    this.manifestPath = path.join(this.updatesDir, "update-manifest.json");
  }

  async checkForUpdates(): Promise<UpdateInfo> {
    const currentVersion = app.getVersion();

    const info: UpdateInfo = {
      currentVersion,
      latestVersion: currentVersion,
      updateAvailable: false,
      channel: "stable",
    };

    if (!fs.existsSync(this.manifestPath)) {
      return info;
    }

    try {
      const content = fs.readFileSync(this.manifestPath, "utf8");
      const manifest = JSON.parse(content) as UpdateManifest;

      info.latestVersion = manifest.version;
      info.channel = manifest.channel || "stable";
      info.releaseNotes = manifest.releaseNotes;
      info.updateAvailable = this.isNewerVersion(
        currentVersion,
        manifest.version
      );

      return info;
    } catch {
      return info;
    }
  }

  async downloadUpdate(_info: UpdateInfo): Promise<string> {
    // For local updates, the file is already on disk
    if (!fs.existsSync(this.manifestPath)) {
      throw new Error("No update manifest found");
    }

    const content = fs.readFileSync(this.manifestPath, "utf8");
    const manifest = JSON.parse(content) as UpdateManifest;

    if (!manifest.filename) {
      throw new Error("Update manifest does not specify a filename");
    }

    const filePath = path.join(this.updatesDir, manifest.filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Update file not found: ${manifest.filename}`);
    }

    return filePath;
  }

  async applyUpdate(_filePath: string): Promise<void> {
    // Placeholder: In production, this would launch the installer
    // and quit the current application.
    throw new Error(
      "Update application is not yet implemented. Please install the update manually."
    );
  }

  async rollback(): Promise<void> {
    // Placeholder: In production, this would restore from a backup.
    throw new Error(
      "Rollback is not yet implemented. Please reinstall the previous version manually."
    );
  }

  /**
   * Compare semver strings. Returns true if latest > current.
   */
  private isNewerVersion(current: string, latest: string): boolean {
    const parseSemver = (v: string) =>
      v
        .replace(/^v/, "")
        .split(".")
        .map((n) => parseInt(n, 10) || 0);

    const c = parseSemver(current);
    const l = parseSemver(latest);

    for (let i = 0; i < 3; i++) {
      const cv = c[i] || 0;
      const lv = l[i] || 0;
      if (lv > cv) return true;
      if (lv < cv) return false;
    }
    return false;
  }
}

// ── Factory ─────────────────────────────────────────────────────────────

/**
 * Create the active update provider.
 * Default: LocalUpdateProvider.
 * Future: can be swapped via config or environment.
 */
export function createUpdateProvider(): UpdateProvider {
  return new LocalUpdateProvider();
}
