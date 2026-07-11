import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { EmployeeFormSchema } from "@/modules/admin/schemas";
import { EmployeeService } from "@/modules/admin/services/employee-service";
import { AppError } from "@/server/errors";

/**
 * GET /api/admin/employees/[id]
 * Retrieves profile detail of a specific employee.
 */
export const GET = wrapAuthRoute(async (_req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Admin", "ManageUsers");

  const { id } = await (context.params as Promise<{ id: string }>);

  const employee = await prisma.employee.findUnique({
    where: { id, isDeleted: false },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      email: true,
      role: true,
      designation: true,
      departmentId: true,
      mobileNumber: true,
      joiningDate: true,
      isActive: true,
      lockedUntil: true,
      failedLoginCount: true,
    },
  });

  if (!employee) {
    throw new AppError("Employee record not found", 404, "NOT_FOUND");
  }

  return employee;
});

/**
 * PUT /api/admin/employees/[id]
 * Updates profile details of a specific employee.
 */
export const PUT = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Admin", "ManageUsers");

  const { id } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();
  // Password is not updated through this main endpoint, so mark it optional
  const validated = ValidationService.validate(
    EmployeeFormSchema.partial({ passwordRaw: true }),
    body
  );

  const updated = await EmployeeService.updateEmployee(id, {
    name: validated.name,
    role: validated.role,
    designation: validated.designation,
    departmentId: validated.departmentId,
    mobileNumber: validated.mobileNumber,
    isActive: validated.isActive,
  });

  return updated;
});
