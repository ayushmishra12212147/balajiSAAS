import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import { AppError } from "@/server/errors";

const permissionSyncSchema = z.object({
  permissions: z.array(
    z.object({
      module: z.string().min(1),
      action: z.string().min(1),
      isAllowed: z.boolean(),
    })
  ),
});

/**
 * GET /api/admin/employees/[id]/permissions
 * Retrieves permission states for a specific employee.
 */
export const GET = wrapAuthRoute(async (_req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Admin", "ManagePermissions");

  const { id: userId } = await (context.params as Promise<{ id: string }>);

  const permissions = await prisma.permission.findMany({
    where: { userId },
    select: {
      module: true,
      action: true,
      isAllowed: true,
    },
  });

  return permissions;
});

/**
 * PUT /api/admin/employees/[id]/permissions
 * Performs diff-based updates inside a transaction to synchronize permissions.
 */
export const PUT = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Admin", "ManagePermissions");

  const { id: userId } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();
  const { permissions: incoming } = ValidationService.validate(permissionSyncSchema, body);

  // Verify target employee exists
  const targetEmployee = await prisma.employee.findUnique({
    where: { id: userId, isDeleted: false },
  });

  if (!targetEmployee) {
    throw new AppError("Target employee record not found", 404, "NOT_FOUND");
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch current allowed permissions for auditing
    const current = await tx.permission.findMany({
      where: { userId },
    });

    const previousState: Record<string, boolean> = {};
    current.forEach((p) => {
      previousState[`${p.module}:${p.action}`] = p.isAllowed;
    });

    // 2. Delete all existing permissions for the target user
    await tx.permission.deleteMany({
      where: { userId },
    });

    // 3. Filter incoming parameters to extract only allowed permissions
    const allowedIncoming = incoming.filter((p) => p.isAllowed);

    // 4. Batch insert all allowed permissions using createMany
    if (allowedIncoming.length > 0) {
      await tx.permission.createMany({
        data: allowedIncoming.map((p) => ({
          userId,
          module: p.module,
          action: p.action,
          isAllowed: true,
        })),
      });
    }

    // 5. Track state changes for security audit trail logging
    const newState: Record<string, boolean> = {};
    allowedIncoming.forEach((p) => {
      newState[`${p.module}:${p.action}`] = true;
    });

    await logAdminAction({
      action: "PERMISSIONS_SYNC",
      resource: "Permission",
      entityId: userId,
      previousState,
      newState,
      description: `Synchronized permissions for ${targetEmployee.email}. Total allowed: ${allowedIncoming.length}.`,
    });

    return {
      message: "Permissions synchronized successfully",
      createdCount: allowedIncoming.length,
      updatedCount: 0,
    };
  });

  return result;
});
