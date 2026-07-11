import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { EmployeeService } from "@/modules/admin/services/employee-service";

/**
 * POST /api/admin/employees/[id]/unlock
 * Clears failed login lockout thresholds for locked employee accounts.
 */
export const POST = wrapAuthRoute(async (_req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Admin", "ManageUsers");

  const { id } = await (context.params as Promise<{ id: string }>);

  const unlocked = await EmployeeService.unlockAccount(id);

  return {
    message: "Employee account unlocked successfully",
    failedLoginCount: unlocked.failedLoginCount,
    lockedUntil: unlocked.lockedUntil,
  };
});
