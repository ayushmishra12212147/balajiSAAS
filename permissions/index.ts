import { prisma } from "@/lib/prisma";
import { PermissionError } from "@/server/errors";

/**
 * Checks in real time whether an employee has permission to execute an action on a module.
 * Super Admin and Hospital Admin bypass permission checks by default.
 */
export async function hasPermission(
  userId: string,
  module: string,
  action: string
): Promise<boolean> {
  const employee = await prisma.employee.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true, isDeleted: true },
  });

  if (!employee || !employee.isActive || employee.isDeleted) {
    return false;
  }

  // Administrators bypass permission toggles by default
  if (employee.role === "SUPER_ADMIN" || employee.role === "HOSPITAL_ADMIN") {
    return true;
  }

  const permission = await prisma.permission.findUnique({
    where: {
      userId_module_action: {
        userId,
        module,
        action,
      },
    },
  });

  return permission?.isAllowed === true;
}

/**
 * Asserts that an employee has permission, throwing a PermissionError if not.
 */
export async function requirePermission(
  userId: string,
  module: string,
  action: string
): Promise<void> {
  const allowed = await hasPermission(userId, module, action);
  if (!allowed) {
    throw new PermissionError(
      `You do not have permission to execute action '${action}' on module '${module}'`
    );
  }
}
