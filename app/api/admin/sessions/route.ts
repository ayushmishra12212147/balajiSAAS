import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";

/**
 * GET /api/admin/sessions
 * List all active system sessions grouped by employee
 */
export const GET = wrapAuthRoute(async () => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "Sessions");

  const sessions = await prisma.session.findMany({
    where: {
      expiresAt: { gt: new Date() },
      isActive: true,
      user: { hospitalId: context.employee.hospitalId },
    },
    include: {
      user: {
        select: {
          id: true,
          employeeCode: true,
          email: true,
          role: true,
          designation: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return sessions;
});

/**
 * DELETE /api/admin/sessions
 * Terminate a specific session or terminate all other sessions
 */
export const DELETE = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "Sessions");

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("id");
  const allExceptCurrent = searchParams.get("all") === "true";

  const currentSessionHash = context.sessionIdHash;

  if (allExceptCurrent) {
    // Terminate all other sessions for this user
    await prisma.session.deleteMany({
      where: {
        userId: context.employee.id,
        id: { not: currentSessionHash },
      },
    });

    await logAdminAction({
      action: "SESSIONS_CLEARED",
      resource: "Session",
      description: `Terminated all other active sessions for user ${context.employee.email}`,
    });

    return { message: "All other sessions terminated successfully." };
  }

  if (!sessionId) {
    throw new AppError("Session ID is required.", 400, "BAD_REQUEST");
  }

  // Correction 5: Never allow an employee to terminate their own current session
  if (sessionId === currentSessionHash) {
    throw new AppError("Protected session constraint: Cannot terminate your own current active session.", 400, "BAD_REQUEST");
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new AppError("Session not found.", 404, "NOT_FOUND");
  }

  await prisma.session.delete({
    where: { id: sessionId },
  });

  await logAdminAction({
    action: "SESSION_TERMINATED",
    resource: "Session",
    entityId: sessionId,
    description: `Terminated active session '${sessionId}' for userId: ${session.userId}`,
  });

  return { message: "Session terminated successfully." };
});
