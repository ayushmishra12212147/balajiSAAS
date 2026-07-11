import fs from "fs";
import path from "path";
import { BackupService } from "./backup-service";

export class BackupScheduler {
  private static isRunning = false;
  private static checkInterval: NodeJS.Timeout | null = null;

  /**
   * Starts the background scheduler loop.
   * Can be safely called multiple times; it will prevent duplicate loops.
   */
  static start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log("⏰ Backup Scheduler initialized. Running health checks every 5 minutes.");

    // Run first check after a short delay (10s), then check every 5 minutes
    setTimeout(() => this.checkAndRun(), 10000);
    this.checkInterval = setInterval(() => this.checkAndRun(), 5 * 60 * 1000);
  }

  /**
   * Performs the cron-like checks and runs the backup if it is past 9 PM and hasn't run today.
   */
  private static async checkAndRun() {
    try {
      const now = new Date();
      const currentHour = now.getHours(); // 0-23

      // Target execution time is 9:00 PM (21:00) or later
      if (currentHour >= 21) {
        const backups = BackupService.listBackups();
        const todayStr = now.toDateString(); // e.g. "Sat Jul 11 2026"
        
        // Scan files to see if a backup was already completed today
        const alreadyBackedUpToday = backups.some((b) => {
          const backupDate = new Date(b.timestamp);
          return backupDate.toDateString() === todayStr;
        });

        if (!alreadyBackedUpToday) {
          console.log(`[BackupScheduler] Time is ${now.toLocaleTimeString()}. Triggering automatic 9 PM database backup...`);
          // Trigger the full backup (operator ID is tagged as system-auto)
          await BackupService.createBackup("FULL", "SYSTEM_AUTO");
          console.log(`[BackupScheduler] Automatic backup completed successfully.`);
        }
      }

      // Automatically purge backup archives older than 15 days
      this.cleanupOldBackups();

    } catch (error) {
      console.error("[BackupScheduler] Error running automatic backup process:", error);
    }
  }

  /**
   * Deletes zip archives in the backups folder that have modification timestamps older than 15 days.
   */
  private static cleanupOldBackups() {
    const backupsDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupsDir)) return;

    try {
      const files = fs.readdirSync(backupsDir);
      const fifteenDaysAgoMs = Date.now() - 15 * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (file.endsWith(".zip") && file.startsWith("backup_")) {
          const filePath = path.join(backupsDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtimeMs < fifteenDaysAgoMs) {
            console.log(`[BackupScheduler] Automatically purging old backup: ${file} (older than 15 days)`);
            fs.unlinkSync(filePath);
          }
        }
      }
    } catch (error) {
      console.error("[BackupScheduler] Error cleaning up old backup archives:", error);
    }
  }
}
