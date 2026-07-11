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
 * GET /api/admin/departments
 * Lists clinical departments. Includes both active and disabled (isDeleted) ones.
 */
export const GET = wrapAuthRoute(async () => {
  const context = RequestContextService.getRequired();
  // Allowed for any authenticated staff member to load departments for OPD/IPD flows

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
  });

  return departments;
});

/**
 * POST /api/admin/departments
 * Provisions a new clinical department.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ManageSettings");

  const body = await req.json();
  const validated = ValidationService.validate(DepartmentFormSchema, body);

  // Check unique constraint on code
  const existingCode = await prisma.department.findUnique({
    where: { code: validated.code },
  });

  if (existingCode) {
    throw new AppError(
      `A department with code '${validated.code}' already exists.`,
      400,
      "BAD_REQUEST"
    );
  }

  const department = await prisma.department.create({
    data: {
      name: validated.name,
      code: validated.code,
      description: validated.description,
      isDeleted: false,
    },
  });

  await logAdminAction({
    action: "DEPARTMENT_CREATE",
    resource: "Department",
    entityId: department.id,
    newState: department,
    description: `Created clinical department ${department.name} (${department.code})`,
  });

  return department;
});
