import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { RadiologyStatus, Prisma } from "@prisma/client";

/**
 * GET /api/radiology/orders
 * Returns a paginated summary list of radiology scan orders.
 * Excludes revisions history to optimize search performance.
 */
export const GET = wrapAuthRoute(async (req: NextRequest) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Radiology", "View");

  const searchParams = req.nextUrl.searchParams;
  const uhid = searchParams.get("uhid") || "";
  const name = searchParams.get("name") || "";
  const opdId = searchParams.get("opdId") || "";
  const status = searchParams.get("status") || "";
  const doctorId = searchParams.get("doctorId") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || "10")));
  const skip = (page - 1) * limit;

  const where: Prisma.RadiologyScanOrderWhereInput = {
    isDeleted: false,
  };

  if (status.trim()) {
    where.status = status as RadiologyStatus;
  }
  if (doctorId.trim()) {
    where.orderedByDoctorId = doctorId;
  }

  // Handle nested patient attributes search
  if (uhid.trim() || name.trim()) {
    where.patient = {
      isDeleted: false,
      uhid: uhid.trim() ? { contains: uhid.trim(), mode: "insensitive" } : undefined,
      name: name.trim() ? { contains: name.trim(), mode: "insensitive" } : undefined,
    };
  }

  // Handle OPD relationship lookup
  if (opdId.trim()) {
    where.opdConsultation = {
      isDeleted: false,
      opdId: { contains: opdId.trim(), mode: "insensitive" },
    };
  }

  // Date filter
  if (startDate || endDate) {
    const dateQuery: Prisma.DateTimeFilter = {};
    if (startDate) {
      const sDate = new Date(startDate);
      sDate.setHours(0, 0, 0, 0);
      dateQuery.gte = sDate;
    }
    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      dateQuery.lte = eDate;
    }
    where.createdAt = dateQuery;
  }

  const total = await prisma.radiologyScanOrder.count({ where });

  const orders = await prisma.radiologyScanOrder.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    // Summary columns only (Excludes results and revisions)
    select: {
      id: true,
      status: true,
      createdAt: true,
      completedAt: true,
      billableChargeId: true,
      patient: {
        select: {
          id: true,
          uhid: true,
          name: true,
          gender: true,
          phone: true,
        },
      },
      scanCatalog: {
        select: {
          name: true,
          code: true,
          category: true,
        },
      },
      orderedByDoctor: {
        select: {
          employee: {
            select: {
              designation: true,
            },
          },
        },
      },
    },
  });

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
});
