import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { OPDRegistrationSchema } from "@/modules/opd/schemas";
import { OPDService } from "@/modules/opd/services/opd-service";
import { Prisma } from "@prisma/client";

/**
 * GET /api/opd
 * Paginated list and filter search of OPD encounters.
 */
export const GET = wrapAuthRoute(async (req: NextRequest) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "OPD", "View");

  const searchParams = req.nextUrl.searchParams;
  const opdId = searchParams.get("opdId") || "";
  const uhid = searchParams.get("uhid") || "";
  const name = searchParams.get("name") || "";
  const phone = searchParams.get("phone") || "";
  const doctorId = searchParams.get("doctorId") || "";
  const departmentId = searchParams.get("departmentId") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || "10")));
  const skip = (page - 1) * limit;

  const where: Prisma.OPDConsultationWhereInput = {
    isDeleted: false,
    hospitalId: reqContext.employee.hospitalId,
  };

  if (opdId.trim()) {
    where.opdId = { contains: opdId.trim(), mode: "insensitive" };
  }
  if (doctorId.trim()) {
    where.doctorId = doctorId;
  }
  if (departmentId.trim()) {
    where.departmentId = departmentId;
  }

  // Handle nested patient attributes search
  if (uhid.trim() || name.trim() || phone.trim()) {
    where.patient = {
      isDeleted: false,
      uhid: uhid.trim() ? { contains: uhid.trim(), mode: "insensitive" } : undefined,
      name: name.trim() ? { contains: name.trim(), mode: "insensitive" } : undefined,
      phone: phone.trim() ? { contains: phone.trim() } : undefined,
    };
  }

  // Handle Date range
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
    where.consultationDate = dateQuery;
  }

  const total = await prisma.oPDConsultation.count({ where });

  const encounters = await prisma.oPDConsultation.findMany({
    where,
    skip,
    take: limit,
    orderBy: { consultationDate: "desc" },
    include: {
      patient: {
        select: {
          id: true,
          uhid: true,
          name: true,
          phone: true,
          gender: true,
          dob: true,
        },
      },
      doctor: {
        select: {
          id: true,
          employee: {
            select: {
              name: true,
              employeeCode: true,
              designation: true,
            },
          },
        },
      },
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return {
    encounters,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
});

/**
 * POST /api/opd
 * Registers an outpatient consultation, validating parameters and idempotency locks.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "OPD", "Register");

  const body = await req.json();
  const validated = ValidationService.validate(OPDRegistrationSchema, body);

  const encounter = await OPDService.registerOPD(
    validated,
    reqContext.employee.id,
    reqContext.employee.hospitalId
  );
  return encounter;
});
