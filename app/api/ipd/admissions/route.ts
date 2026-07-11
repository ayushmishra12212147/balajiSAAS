import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { AdmissionFormSchema } from "@/modules/ipd/schemas";
import { IPDService } from "@/modules/ipd/services/ipd-service";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * GET /api/ipd/admissions
 * Returns a paginated listing of IPD admissions.
 */
export const GET = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "IPD", "View");

  const searchParams = req.nextUrl.searchParams;
  const ipdId = searchParams.get("ipdId") || "";
  const uhid = searchParams.get("uhid") || "";
  const name = searchParams.get("name") || "";
  const status = searchParams.get("status") || ""; // "ACTIVE", "DISCHARGED", "DECEASED"
  const doctorId = searchParams.get("doctorId") || "";
  const startDate = searchParams.get("startDate") || "";
  
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || "10")));
  const skip = (page - 1) * limit;

  const where: Prisma.IPDAdmissionWhereInput = {
    isDeleted: false,
    hospitalId: context.employee.hospitalId,
  };

  if (ipdId.trim()) {
    where.ipdId = { equals: ipdId.trim(), mode: "insensitive" };
  }
  if (doctorId.trim()) {
    where.primaryDoctorId = doctorId;
  }

  // Handle nested patient attributes search
  if (uhid.trim() || name.trim()) {
    where.patient = {
      isDeleted: false,
      uhid: uhid.trim() ? { equals: uhid.trim(), mode: "insensitive" } : undefined,
      name: name.trim() ? { contains: name.trim(), mode: "insensitive" } : undefined,
    };
  }

  // Active / Discharged filter
  if (status === "ACTIVE") {
    where.dischargeDate = null;
    where.cancelledAt = null;
    where.isDeceased = false;
  } else if (status === "DISCHARGED") {
    where.dischargeDate = { not: null };
    where.isDeceased = false;
  } else if (status === "DECEASED") {
    where.isDeceased = true;
  }

  // Date ordered filter
  if (startDate) {
    const sDate = new Date(startDate);
    sDate.setHours(0, 0, 0, 0);
    where.admissionDate = { gte: sDate };
  }

  const total = await prisma.iPDAdmission.count({ where });

  const admissions = await prisma.iPDAdmission.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      ipdId: true,
      admissionDate: true,
      dischargeDate: true,
      isDeceased: true,
      patient: {
        select: {
          id: true,
          uhid: true,
          name: true,
          gender: true,
          phone: true,
        },
      },
      bed: {
        select: {
          bedNumber: true,
          room: {
            select: {
              roomNumber: true,
              roomType: true,
            },
          },
        },
      },
      primaryDoctor: {
        select: {
          employee: {
            select: {
              name: true,
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
    admissions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
});

/**
 * POST /api/ipd/admissions
 * Admits a patient, allocating beds and generating initial charges.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "IPD", "Admit");

  const body = await req.json();
  const validated = ValidationService.validate(AdmissionFormSchema, body);

  const admission = await IPDService.admitPatient(
    validated,
    context.employee.id
  );

  return admission;
});
