import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "./audit-service";
import { SettingsService } from "./settings-service";

export interface BackupMetadata {
  filename: string;
  size: number;
  type: "FULL" | "INCREMENTAL";
  timestamp: string;
  checksum: string;
  status: "SUCCESS" | "FAILED";
  version: string;
}

export interface RestoreLog {
  backupFile: string;
  backupVersion: string;
  restoredBy: string;
  restoreStarted: string;
  restoreCompleted: string;
  restoreStatus: "SUCCESS" | "FAILED";
}

/**
 * BackupService
 * Coordinates pg_dump/psql native backups, ZIP packaging, checksums, and history logging.
 * Fully compatible with packaged Electron deployments.
 */
export class BackupService {
  private static backupsDir = path.join(process.cwd(), "backups");
  private static uploadsDir = path.join(process.cwd(), "uploads");
  private static logsDir = path.join(process.cwd(), "logs");
  private static restoreHistoryPath = path.join(process.cwd(), "logs", "restore_history.json");

  /**
   * Safe parser for DATABASE_URL strings
   */
  private static parseDatabaseUrl() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new AppError("DATABASE_URL env variable is missing", 500, "DATABASE_ERROR");
    }
    try {
      // Temporarily swap protocol to parse using built-in URL utility
      const parsed = new URL(url.replace(/^postgres(ql)?:\/\//, "http://"));
      return {
        user: parsed.username,
        password: decodeURIComponent(parsed.password),
        host: parsed.hostname,
        port: parsed.port || "5432",
        database: parsed.pathname.replace(/^\//, ""),
      };
    } catch {
      throw new AppError("Failed to parse PostgreSQL DATABASE_URL format.", 500, "DATABASE_ERROR");
    }
  }

  /**
   * Helper to locate native PostgreSQL executables (pg_dump, psql) on Windows
   */
  private static getPgCommandPath(cmdName: string): string {
    const isWindows = process.platform === "win32";
    if (!isWindows) {
      return cmdName;
    }
    
    // Check if it's already in the PATH
    try {
      const { execSync } = require("child_process");
      execSync(`where.exe ${cmdName}`, { stdio: "ignore" });
      return cmdName;
    } catch {
      // Search common PostgreSQL installations
      const pgPath = "C:\\Program Files\\PostgreSQL";
      if (fs.existsSync(pgPath)) {
        try {
          const versions = fs.readdirSync(pgPath).sort((a, b) => b.localeCompare(a));
          for (const ver of versions) {
            const binPath = path.join(pgPath, ver, "bin", `${cmdName}.exe`);
            if (fs.existsSync(binPath)) {
              return binPath;
            }
          }
        } catch {
          // Ignore read errors
        }
      }
      return `${cmdName}.exe`;
    }
  }

  /**
   * Helper to ensure basic directories exist
   */
  private static ensureDirectories() {
    if (!fs.existsSync(this.backupsDir)) {
      fs.mkdirSync(this.backupsDir, { recursive: true });
    }
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Generates SHA-256 checksum for a file buffer/path
   */
  static getChecksum(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  }

  /**
   * Scans and returns list of backups in backups folder
   */
  static listBackups(): BackupMetadata[] {
    this.ensureDirectories();
    const files = fs.readdirSync(this.backupsDir);
    const backups: BackupMetadata[] = [];

    for (const file of files) {
      if (file.endsWith(".zip") && file.startsWith("backup_")) {
        const filePath = path.join(this.backupsDir, file);
        const stats = fs.statSync(filePath);
        
        // Parse metadata parts from file: backup_[type]_[timestamp]_[checksum].zip
        const parts = file.replace(/\.zip$/, "").split("_");
        if (parts.length >= 4) {
          const type = parts[1] as "FULL" | "INCREMENTAL";
          const timestamp = parts[2];
          const checksum = parts[3];
          
          backups.push({
            filename: file,
            size: stats.size,
            type,
            timestamp: new Date(Number(timestamp)).toISOString(),
            checksum,
            status: "SUCCESS",
            version: "2.0.0",
          });
        }
      }
    }

    return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  /**
   * Generates a compressed native database and settings backup ZIP package
   */
  static async createBackup(type: "FULL" | "INCREMENTAL" = "FULL", operatorId: string): Promise<BackupMetadata> {
    this.ensureDirectories();
    const timestamp = Date.now();
    const db = this.parseDatabaseUrl();

    // Create temp directory for packaging
    const tempDirName = `tmp_backup_${timestamp}`;
    const tempPath = path.join(this.backupsDir, tempDirName);
    fs.mkdirSync(tempPath, { recursive: true });

    try {
      // 1. Export database via pg_dump
      const sqlFilename = "database.sql";
      const sqlPath = path.join(tempPath, sqlFilename);
      
      // Execute pg_dump using execFileSync with an argument array
      execFileSync(this.getPgCommandPath("pg_dump"), [
        "-h", db.host,
        "-p", db.port,
        "-U", db.user,
        "-d", db.database,
        "-F", "p",
        "-f", sqlPath
      ], {
        env: {
          ...process.env,
          PGPASSWORD: db.password,
        },
        windowsHide: true,
      });

      // 2. Export active settings JSON
      const settings = await prisma.systemSetting.findMany({ where: { isDeleted: false } });
      fs.writeFileSync(path.join(tempPath, "settings.json"), JSON.stringify(settings, null, 2));

      // 3. Export active templates JSON
      const templates = await prisma.printTemplate.findMany({ where: { isDeleted: false } });
      fs.writeFileSync(path.join(tempPath, "templates.json"), JSON.stringify(templates, null, 2));

      // 4. Copy uploaded files folder if populated
      const tempUploads = path.join(tempPath, "uploads");
      fs.mkdirSync(tempUploads, { recursive: true });
      if (fs.existsSync(this.uploadsDir)) {
        const uploadFiles = fs.readdirSync(this.uploadsDir);
        for (const file of uploadFiles) {
          const src = path.join(this.uploadsDir, file);
          if (fs.statSync(src).isFile()) {
            fs.copyFileSync(src, path.join(tempUploads, file));
          }
        }
      }

      // 5. Build metadata.json
      const meta = {
        type,
        timestamp: new Date(timestamp).toISOString(),
        version: "2.0.0",
      };
      fs.writeFileSync(path.join(tempPath, "metadata.json"), JSON.stringify(meta, null, 2));

      // 6. Zip everything inside temp workspace using native OS tools (shell-less parameterization)
      const zipName = `backup_${type}_${timestamp}_PENDING.zip`;
      const zipPath = path.join(this.backupsDir, zipName);
      
      const isWindows = process.platform === "win32";
      if (isWindows) {
        // Run PowerShell Compress-Archive command via shell-less arguments
        execFileSync("powershell.exe", [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `Compress-Archive -Path '${tempPath}\\*' -DestinationPath '${zipPath}' -Force`
        ], {
          windowsHide: true,
        });
      } else {
        // Run UNIX zip command via shell-less arguments
        execFileSync("zip", ["-r", zipPath, "./*"], {
          cwd: tempPath,
        });
      }

      // 7. Calculate SHA-256 checksum and rename to include it in name
      const checksum = this.getChecksum(zipPath);
      const finalZipName = `backup_${type}_${timestamp}_${checksum}.zip`;
      const finalZipPath = path.join(this.backupsDir, finalZipName);
      fs.renameSync(zipPath, finalZipPath);

      // Log admin audit action
      await logAdminAction({
        action: "BACKUP_CREATED",
        resource: "System",
        description: `Created new ${type} backup archive file '${finalZipName}' with checksum '${checksum}'`,
      });

      return {
        filename: finalZipName,
        size: fs.statSync(finalZipPath).size,
        type,
        timestamp: new Date(timestamp).toISOString(),
        checksum,
        status: "SUCCESS",
        version: "2.0.0",
      };
    } finally {
      // Safely delete temp directory
      try {
        if (fs.existsSync(tempPath)) {
          fs.rmSync(tempPath, { recursive: true, force: true });
        }
      } catch {
        // Ignore removal locks
      }
    }
  }

  /**
   * Validates a backup file checksum and metadata structure
   */
  static validateBackup(filename: string): { isValid: boolean; metadata: any } {
    this.ensureDirectories();
    const zipPath = path.join(this.backupsDir, filename);
    if (!fs.existsSync(zipPath)) {
      throw new AppError(`Backup file '${filename}' does not exist.`, 404, "NOT_FOUND");
    }

    // 1. Validate SHA-256 checksum matches name
    const checksum = this.getChecksum(zipPath);
    const parts = filename.replace(/\.zip$/, "").split("_");
    const expectedChecksum = parts[3];

    if (checksum !== expectedChecksum) {
      return { isValid: false, metadata: null };
    }

    return {
      isValid: true,
      metadata: {
        filename,
        checksum,
        type: parts[1],
        timestamp: new Date(Number(parts[2])).toISOString(),
        version: "2.0.0",
      },
    };
  }

  /**
   * Restores a backup file following safety guidelines:
   * 1. Validate backup
   * 2. Auto-generate pre-restore safe rollback snapshot
   * 3. Drops public database schema
   * 4. Restores schema + records using psql execution
   * 5. Restores uploads directories files
   */
  static async restoreBackup(filename: string, operatorId: string): Promise<void> {
    const started = new Date().toISOString();
    this.ensureDirectories();

    // 1. Verify backup checksum first
    const { isValid, metadata } = this.validateBackup(filename);
    if (!isValid) {
      this.logRestore({
        backupFile: filename,
        backupVersion: "2.0.0",
        restoredBy: operatorId,
        restoreStarted: started,
        restoreCompleted: new Date().toISOString(),
        restoreStatus: "FAILED",
      });
      throw new AppError("Backup validation failed: Checksum signature mismatch. File might be corrupted.", 400, "BAD_REQUEST");
    }

    // 2. Automatically create pre-restore safe rollback backup
    await this.createBackup("FULL", operatorId);

    const db = this.parseDatabaseUrl();
    const tempDirName = `tmp_restore_${Date.now()}`;
    const tempPath = path.join(this.backupsDir, tempDirName);
    fs.mkdirSync(tempPath, { recursive: true });

    try {
      // 3. Extract ZIP contents
      const zipPath = path.join(this.backupsDir, filename);
      const isWindows = process.platform === "win32";
       if (isWindows) {
        execFileSync("powershell.exe", [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `Expand-Archive -Path '${zipPath}' -DestinationPath '${tempPath}' -Force`
        ], {
          windowsHide: true,
        });
      } else {
        execFileSync("unzip", ["-o", zipPath, "-d", tempPath]);
      }

      // 4. Verify dump files exist
      const sqlPath = path.join(tempPath, "database.sql");
      if (!fs.existsSync(sqlPath)) {
        throw new AppError("Backup format invalid: Missing database SQL dump.", 400, "BAD_REQUEST");
      }

      // 5. Clean public database schema (drop all existing tables & constraints)
      await prisma.$executeRawUnsafe("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");

      // 6. Execute PostgreSQL restore using psql with array parameters
      execFileSync(this.getPgCommandPath("psql"), [
        "-h", db.host,
        "-p", db.port,
        "-U", db.user,
        "-d", db.database,
        "-f", sqlPath
      ], {
        env: {
          ...process.env,
          PGPASSWORD: db.password,
        },
        windowsHide: true,
      });

      // 7. Restore uploaded files folder
      const tempUploads = path.join(tempPath, "uploads");
      if (fs.existsSync(tempUploads)) {
        // Clear current uploads directory
        if (fs.existsSync(this.uploadsDir)) {
          const files = fs.readdirSync(this.uploadsDir);
          for (const f of files) {
            fs.unlinkSync(path.join(this.uploadsDir, f));
          }
        } else {
          fs.mkdirSync(this.uploadsDir, { recursive: true });
        }
        
        // Copy files back
        const restoreFiles = fs.readdirSync(tempUploads);
        for (const file of restoreFiles) {
          fs.copyFileSync(path.join(tempUploads, file), path.join(this.uploadsDir, file));
        }
      }

      // 8. Log Restore History
      const completed = new Date().toISOString();
      this.logRestore({
        backupFile: filename,
        backupVersion: metadata.version,
        restoredBy: operatorId,
        restoreStarted: started,
        restoreCompleted: completed,
        restoreStatus: "SUCCESS",
      });

      // Log admin audit action
      await logAdminAction({
        action: "RESTORE_EXECUTED",
        resource: "System",
        description: `Executed database and system restore from backup '${filename}' successfully. Rollback snapshot saved.`,
      });
    } catch (err: any) {
      this.logRestore({
        backupFile: filename,
        backupVersion: "2.0.0",
        restoredBy: operatorId,
        restoreStarted: started,
        restoreCompleted: new Date().toISOString(),
        restoreStatus: "FAILED",
      });
      throw new AppError(`System restore failed: ${err.message || err}`, 500, "INTERNAL_SERVER_ERROR");
    } finally {
      // Clean up extract temporary path
      try {
        if (fs.existsSync(tempPath)) {
          fs.rmSync(tempPath, { recursive: true, force: true });
        }
      } catch {
        // Ignore cleanup locks
      }
    }
  }

  /**
   * Appends a restore event record to the filesystem restore history registry
   */
  private static logRestore(log: RestoreLog) {
    this.ensureDirectories();
    let history: RestoreLog[] = [];
    if (fs.existsSync(this.restoreHistoryPath)) {
      try {
        const raw = fs.readFileSync(this.restoreHistoryPath, "utf-8");
        history = JSON.parse(raw);
      } catch {
        // Ignore corrupted logs and re-write
      }
    }
    history.push(log);
    fs.writeFileSync(this.restoreHistoryPath, JSON.stringify(history, null, 2));
  }

  /**
   * Returns complete immutable list of restore operations execution history
   */
  static listRestoreHistory(): RestoreLog[] {
    this.ensureDirectories();
    if (!fs.existsSync(this.restoreHistoryPath)) {
      return [];
    }
    try {
      const raw = fs.readFileSync(this.restoreHistoryPath, "utf-8");
      return JSON.parse(raw) as RestoreLog[];
    } catch {
      return [];
    }
  }

  /**
   * Stub structure to support Future Scheduled Backups configuration
   */
  static async scheduleBackup(cronExpression: string): Promise<void> {
    // Layout for background crons setup (e.g. node-cron bindings in production server wrapper)
    console.log(`Configuring backup cron scheduler setting: '${cronExpression}'`);
  }
}
