import { prisma } from "@/lib/prisma";
import { RequestContextService } from "@/lib/services/request-context-service";

interface LogAdminActionParams {
  action: string;
  resource: string;
  entityId?: string;
  previousState?: unknown;
  newState?: unknown;
  reason?: string;
  description: string;
}

/**
 * logAdminAction
 * Centralized service to record admin operations.
 * Automatically resolves active requestId, operator employeeId, and clientIp
 * from RequestContextService storage.
 */
export async function logAdminAction(params: LogAdminActionParams) {
  const context = RequestContextService.get();

  const userId = context?.employee?.id || null;
  const clientIp = context?.ipAddress || null;
  const requestId = context?.requestId || null;

  // Validate that entityId is a valid UUID before inserting into DB (Prisma validation safety)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validEntityId = params.entityId && uuidRegex.test(params.entityId) ? params.entityId : null;

  return prisma.audit.create({
    data: {
      userId,
      clientIp,
      action: params.action,
      resource: params.resource,
      entityId: validEntityId,
      requestId,
      previousState: params.previousState ? JSON.parse(JSON.stringify(params.previousState)) : null,
      newState: params.newState ? JSON.parse(JSON.stringify(params.newState)) : null,
      reason: params.reason || null,
      description: params.description,
    },
  });
}
