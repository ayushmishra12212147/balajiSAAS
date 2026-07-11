import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/audits
 * Search and retrieve security audit logs with filters and pagination.
 * GET only. Exposes no POST/PUT/DELETE mutations to preserve immutable trail logs.
 */
export const GET = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ViewAudit");

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const action = searchParams.get("action") || undefined;
  const resource = searchParams.get("resource") || undefined;
  const userId = searchParams.get("userId") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 20)));
  const skip = (page - 1) * limit;

  // Build prisma query condition mapping
  interface AuditWhereCondition {
    description?: { contains: string; mode: "insensitive" };
    action?: string;
    resource?: string;
    userId?: string;
    timestamp?: { gte?: Date; lte?: Date };
  }
  const where: AuditWhereCondition = {};

  if (search) {
    where.description = { contains: search, mode: "insensitive" };
  }
  if (action) {
    where.action = action;
  }
  if (resource) {
    where.resource = resource;
  }
  if (userId) {
    where.userId = userId;
  }
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) {
      where.timestamp.gte = new Date(startDate);
    }
    if (endDate) {
      where.timestamp.lte = new Date(endDate);
    }
  }

  const [audits, total] = await Promise.all([
    prisma.audit.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip,
      take: limit,
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
    }),
    prisma.audit.count({ where }),
  ]);

  // Clean JSON payloads for safe serialization (handling any nested BigInts or values)
  const serialized = audits.map((a) => ({
    ...a,
    previousState: a.previousState ? JSON.parse(JSON.stringify(a.previousState)) : null,
    newState: a.newState ? JSON.parse(JSON.stringify(a.newState)) : null,
  }));

  return {
    data: serialized,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
});
