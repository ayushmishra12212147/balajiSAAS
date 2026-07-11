import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { LicenseService, LicenseData } from "@/modules/admin/services/license-service";
import { SettingsService } from "@/modules/admin/services/settings-service";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";

/**
 * GET /api/admin/license
 * Get default system license validation details and days remaining status
 */
export const GET = wrapAuthRoute(async () => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "License");

  const status = await LicenseService.getLicenseStatus();
  return status;
});

/**
 * POST /api/admin/license
 * Update activation key and validation payload
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "License");

  const body = await req.json();
  const { licenseKey, licenseData } = body as { licenseKey: string; licenseData: LicenseData };

  if (!licenseKey || !licenseData) {
    throw new AppError("License key and metadata are required.", 400, "BAD_REQUEST");
  }

  // Validate inputs format
  if (!licenseData.expiryDate || !licenseData.registeredHospital || !licenseData.registeredOwner) {
    throw new AppError("Invalid license metadata fields.", 400, "BAD_REQUEST");
  }

  const isValid = LicenseService.validate(licenseKey, licenseData);
  if (!isValid) {
    throw new AppError("Invalid activation key. Check registration details and signature formatting.", 400, "BAD_REQUEST");
  }

  // Save properties inside database settings
  await SettingsService.setSetting("license_key", licenseKey.trim());
  await SettingsService.setSetting("license_data", JSON.stringify(licenseData));

  await logAdminAction({
    action: "LICENSE_UPDATED",
    resource: "SystemSetting",
    description: `Updated hospital system license key. Expiry: ${licenseData.expiryDate}. Registered to: ${licenseData.registeredHospital}`,
  });

  return { message: "License activated successfully.", isValid: true };
});
