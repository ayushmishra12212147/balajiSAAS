
import { destroyAllSessionsForUser } from "@/modules/auth/services/session";
import { CookieService } from "@/lib/services/cookie-service";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/logout-all
 * Invalidates all active database sessions matching the logged-in employee ID.
 */
export const POST = wrapAuthRoute(async () => {
  const context = RequestContextService.getRequired();
  const employeeId = context.employee.id;
  const clientIp = context.ipAddress;

  // 1. Write Audit Log
  await prisma.audit.create({
    data: {
      userId: employeeId,
      action: "LOGOUT_ALL_DEVICES",
      resource: "Employee",
      entityId: employeeId,
      clientIp,
      description: `Successful logout from all active devices.`,
    },
  });

  // 2. Clear all active sessions in DB
  await destroyAllSessionsForUser(employeeId);

  // 3. Invalidate client-side cookies
  await CookieService.clearSessionToken();
  await CookieService.clearCsrfToken();

  return { message: "Logged out from all devices successfully" };
});
