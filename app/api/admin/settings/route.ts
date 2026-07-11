import { NextRequest, NextResponse } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { SystemSettingsFormSchema } from "@/modules/admin/schemas";
import { SettingsService, SettingKeyType, SETTING_DEFINITIONS } from "@/modules/admin/services/settings-service";

/**
 * GET /api/admin/settings
 * Retrieves all defined application configurations and default settings.
 */
export const GET = wrapAuthRoute(async () => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ManageSettings");

  const result: Record<string, unknown> = {};
  
  // Iterate defined keys to pull settings values
  for (const key of Object.keys(SETTING_DEFINITIONS) as SettingKeyType[]) {
    result[key] = await SettingsService.getSetting(key);
  }

  return result;
});

/**
 * POST /api/admin/settings
 * Accepts bulk system setting parameters, validates format, and updates key-value records.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ManageSettings");

  const body = await req.json();
  const validated = ValidationService.validate(SystemSettingsFormSchema, body);

  // Bulk update settings keys
  for (const [key, val] of Object.entries(validated)) {
    const stringVal = typeof val === "object" && val !== null ? JSON.stringify(val) : String(val);
    await SettingsService.setSetting(key as SettingKeyType, stringVal);
  }

  return NextResponse.json({ message: "System settings saved successfully" });
});
