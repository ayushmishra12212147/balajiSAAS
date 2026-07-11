import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { OTRegistrationSchema } from "@/modules/ot/schemas";
import { OTService } from "@/modules/ot/services/ot-service";
import { prisma } from "@/lib/prisma";
import { Prisma, OTType } from "@prisma/client";

/**
 * GET /api/ot
 * Returns a paginated listing of scheduled/completed surgical operations. Revisions are excluded.
 */
export const GET = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "OT", "View");

  const searchParams = req.nextUrl.searchParams;
  const otId = searchParams.get("otId") || "";
  const name = searchParams.get("name") || "";
  const uhid = searchParams.get("uhid") || "";
  const type = searchParams.get("type") || ""; // "MINOR" | "MAJOR" | ""
  const status = searchParams.get("status") || ""; // "SCHEDULED", "COMPLETED", "CANCELLED"
  const surgeonId = searchParams.get("surgeonId") || "";

  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || "10")));
  const skip = (page - 1) * limit;

  const where: Prisma.OperationTheaterWhereInput = {
    isDeleted: false,
    hospitalId: context.employee.hospitalId,
  };

  if (otId.trim()) {
    where.otId = { contains: otId.trim(), mode: "insensitive" };
  }
  if (type.trim()) {
    where.operationType = type as OTType;
  }
  if (surgeonId.trim()) {
    where.primarySurgeonId = surgeonId;
  }

  // Handle nested patient attributes search
  if (uhid.trim() || name.trim()) {
    where.patient = {
      isDeleted: false,
      uhid: uhid.trim() ? { contains: uhid.trim(), mode: "insensitive" } : undefined,
      name: name.trim() ? { contains: name.trim(), mode: "insensitive" } : undefined,
    };
  }

  // Handle status filters
  if (status === "COMPLETED") {
    where.completedAt = { not: null };
  } else if (status === "CANCELLED") {
    where.cancelledAt = { not: null };
  } else if (status === "SCHEDULED") {
    where.completedAt = null;
    where.cancelledAt = null;
  }

  const total = await prisma.operationTheater.count({ where });

  const otBookings = await prisma.operationTheater.findMany({
    where,
    skip,
    take: limit,
    orderBy: { scheduledDate: "desc" },
    select: {
      id: true,
      otId: true,
      operationName: true,
      operationType: true,
      scheduledDate: true,
      completedAt: true,
      cancelledAt: true,
      patient: {
        select: {
          id: true,
          uhid: true,
          name: true,
          gender: true,
        },
      },
      primarySurgeon: {
        select: {
          employee: {
            select: {
              designation: true,
            },
          },
        },
      },
      department: {
        select: {
          name: true,
        },
      },
    },
  });

  return {
    otBookings,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
});

/**
 * POST /api/ot
 * Registers a new Operation Theatre booking (Minor or Major).
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "OT", "Register");

  const body = await req.json();
  const validated = ValidationService.validate(OTRegistrationSchema, body);

  const ot = await OTService.registerOT(validated, context.employee.id);
  return ot;
});
