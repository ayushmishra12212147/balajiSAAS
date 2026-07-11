import { prisma } from "@/lib/prisma";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";

/**
 * GET /api/admin/employees/lookup
 * Bypasses admin permissions to return active employee codes & designations
 * for technicians and verifier selectors. Securely scoped to hospital context.
 */
export const GET = wrapAuthRoute(async () => {
  const context = RequestContextService.getRequired();

  const employees = await prisma.employee.findMany({
    where: {
      hospitalId: context.employee.hospitalId,
      isActive: true,
      isDeleted: false,
    },
    select: {
      id: true,
      employeeCode: true,
      designation: true,
    },
    orderBy: { employeeCode: "asc" },
  });

  return employees;
});
