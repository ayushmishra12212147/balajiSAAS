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
    // 1. Fetch current permissions
    const current = await tx.permission.findMany({
      where: { userId },
    });

    const currentMap = new Map<string, boolean>();
    current.forEach((p) => {
      currentMap.set(`${p.module}:${p.action}`, p.isAllowed);
    });

    const createdList: string[] = [];
    const updatedList: string[] = [];
    
    // Track previous and new states for auditing
    const auditDiff: { before: Record<string, boolean>; after: Record<string, boolean> } = {
      before: {},
      after: {},
    };

    // 2. Loop through incoming permissions to sync diffs
    for (const p of incoming) {
      const key = `${p.module}:${p.action}`;
      const hasKey = currentMap.has(key);
      const currentAllowed = currentMap.get(key);

      if (!hasKey) {
        // Create if missing and isAllowed state is different from default (false)
        if (p.isAllowed) {
          await tx.permission.create({
            data: {
              userId,
              module: p.module,
              action: p.action,
              isAllowed: true,
            },
          });
          createdList.push(key);
          auditDiff.before[key] = false;
          auditDiff.after[key] = true;
        }
      } else if (currentAllowed !== p.isAllowed) {
        // Update only if isAllowed state has changed
        await tx.permission.update({
          where: {
            userId_module_action: {
              userId,
              module: p.module,
              action: p.action,
            },
          },
          data: {
            isAllowed: p.isAllowed,
          },
        });
        updatedList.push(key);
        auditDiff.before[key] = currentAllowed ?? false;
        auditDiff.after[key] = p.isAllowed;
      }
    }

    if (createdList.length > 0 || updatedList.length > 0) {
      await logAdminAction({
        action: "PERMISSIONS_SYNC",
        resource: "Permission",
        entityId: userId,
        previousState: auditDiff.before,
        newState: auditDiff.after,
        description: `Synchronized permissions for ${targetEmployee.email}. Created: ${createdList.length}, Updated: ${updatedList.length}.`,
      });
    }

    return {
      message: "Permissions synchronized successfully",
      createdCount: createdList.length,
      updatedCount: updatedList.length,
    };
  });

  return result;
});
