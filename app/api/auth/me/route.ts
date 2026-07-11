
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";

import { MaintenanceService } from "@/modules/admin/services/maintenance-service";
import { LicenseService } from "@/modules/admin/services/license-service";

/**
 * GET /api/auth/me
 * Retrieves current employee details, hospital tenant configurations, and active permission codes.
 */
export const GET = wrapAuthRoute(async () => {
  const context = RequestContextService.getRequired();
  const employee = context.employee;

  const isMaintenanceActive = await MaintenanceService.isMaintenanceActive();
  const maintenanceMessage = await MaintenanceService.getMaintenanceMessage();
  const license = await LicenseService.getLicenseStatus();

  return {
    id: employee.id,
    email: employee.email,
    employeeCode: employee.employeeCode,
    role: employee.role,
    designation: employee.designation,
    hospitalName: context.hospital.name,
    permissions: context.permissions,
    isMaintenanceActive,
    maintenanceMessage,
    isLicenseExpired: license.isExpired,
  };
});
