import { SettingsService } from "./settings-service";

/**
 * MaintenanceService
 * Manages hospital maintenance state triggers.
 */
export class MaintenanceService {
  /**
   * Checks if maintenance mode is active in system settings
   */
  static async isMaintenanceActive(): Promise<boolean> {
    try {
      const mode = await SettingsService.getSetting("maintenance_mode");
      return mode === true;
    } catch {
      return false;
    }
  }

  /**
   * Retrieves active maintenance display text description
   */
  static async getMaintenanceMessage(): Promise<string> {
    try {
      const msg = await SettingsService.getSetting("maintenance_message");
      return typeof msg === "string" ? msg : "System is undergoing scheduled maintenance. Please try again later.";
    } catch {
      return "System is undergoing scheduled maintenance. Please try again later.";
    }
  }

  /**
   * Sets maintenance mode configurations in database settings
   */
  static async setMaintenance(active: boolean, message: string): Promise<void> {
    await SettingsService.setSetting("maintenance_mode", active ? "true" : "false");
    if (message.trim().length > 0) {
      await SettingsService.setSetting("maintenance_message", message.trim());
    }
  }
}
