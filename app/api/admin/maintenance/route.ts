import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { MaintenanceService } from "@/modules/admin/services/maintenance-service";
import { SettingsService } from "@/modules/admin/services/settings-service";
import { logAdminAction } from "@/modules/admin/services/audit-service";

/**
 * GET /api/admin/maintenance
 * Read system maintenance status details
 */
export const GET = wrapAuthRoute(async () => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "Maintenance");

  const active = await MaintenanceService.isMaintenanceActive();
  const message = await MaintenanceService.getMaintenanceMessage();
  const blockOnExpiry = await SettingsService.getSetting("maintenance_block_on_expiry");

  return { active, message, blockOnExpiry };
});

/**
 * POST /api/admin/maintenance
 * Toggle maintenance status or override messages
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "Maintenance");

  const body = await req.json();
  const { active, message, blockOnExpiry } = body;

  if (active !== undefined) {
    await MaintenanceService.setMaintenance(!!active, message || "");
    await logAdminAction({
      action: active ? "MAINTENANCE_ENABLED" : "MAINTENANCE_DISABLED",
      resource: "SystemSetting",
      description: active 
        ? `Enabled system maintenance mode. Message: "${message || 'Under scheduled maintenance.'}"`
        : `Disabled system maintenance mode. System restored online.`
    });
  }

  if (blockOnExpiry !== undefined) {
    await SettingsService.setSetting("maintenance_block_on_expiry", blockOnExpiry ? "true" : "false");
    await logAdminAction({
      action: "SETTING_UPDATE",
      resource: "SystemSetting",
      description: `Updated license expiry lock to: ${blockOnExpiry}`
    });
  }

  return { 
    message: "Maintenance parameters updated successfully.",
    active: await MaintenanceService.isMaintenanceActive(),
    messageText: await MaintenanceService.getMaintenanceMessage()
  };
});
