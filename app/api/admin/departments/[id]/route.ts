import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { DepartmentFormSchema } from "@/modules/admin/schemas";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import { AppError } from "@/server/errors";

/**
 * PUT /api/admin/departments/[id]
 * Updates clinical department configurations.
 * Enforces deactivation checks to block disabling if active doctors are still assigned.
 */
export const PUT = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Admin", "ManageSettings");

  const { id } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();
  const validated = ValidationService.validate(DepartmentFormSchema, body);

  const before = await prisma.department.findUnique({
    where: { id },
  });

  if (!before) {
    throw new AppError("Department record not found", 404, "NOT_FOUND");
  }

  // Deactivation integrity check
  if (validated.isDeleted === true && before.isDeleted === false) {
    const activeDoctorsCount = await prisma.doctor.count({
      where: {
        isDeleted: false,
        employee: {
          departmentId: id,
          isActive: true,
          isDeleted: false,
        },
      },
    });

    if (activeDoctorsCount > 0) {
      throw new AppError(
        `Cannot disable department '${before.name}' because ${activeDoctorsCount} active doctor(s) are still assigned to it. Reassign doctors before disabling.`,
        400,
        "BAD_REQUEST"
      );
    }
  }

  const updated = await prisma.department.update({
    where: { id },
    data: {
      name: validated.name,
      code: validated.code,
      description: validated.description,
      isDeleted: validated.isDeleted,
    },
  });

  await logAdminAction({
    action: "DEPARTMENT_UPDATE",
    resource: "Department",
    entityId: id,
    previousState: before,
    newState: updated,
    description: `Updated clinical department ${updated.name} (${updated.code}). Status: ${
      updated.isDeleted ? "Disabled" : "Enabled"
    }`,
  });

  return updated;
});
