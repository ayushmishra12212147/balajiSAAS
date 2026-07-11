import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { PatientFormSchema } from "@/modules/patients/schemas";
import { PatientService } from "@/modules/patients/services/patient-service";
import { Prisma } from "@prisma/client";

/**
 * GET /api/patients
 * Paginated search. Returns minimal columns only.
 */
export const GET = wrapAuthRoute(async (req: NextRequest) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Patient", "View");

  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || "10")));
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = (searchParams.get("sortOrder") || "desc") === "asc" ? "asc" : "desc";

  const skip = (page - 1) * limit;

  // Enforce search conditions
  const where: Prisma.PatientWhereInput = {
    isDeleted: false,
    hospitalId: reqContext.employee.hospitalId,
  };

  if (search.trim()) {
    const query = search.trim();
    where.OR = [
      { uhid: { contains: query, mode: "insensitive" } },
      { name: { contains: query, mode: "insensitive" } },
      { phone: { contains: query } },
      { aadhaarNumber: { contains: query } },
    ];
  }

  // Count total matches for pagination metadata
  const total = await prisma.patient.count({ where });

  // Load only minimal columns for search list views
  const patients = await prisma.patient.findMany({
    where,
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
    select: {
      id: true,
      uhid: true,
      name: true,
      gender: true,
      dob: true,
      phone: true,
      version: true,
      address: {
        select: {
          city: true,
        },
      },
    },
  });

  return {
    patients,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
});

/**
 * POST /api/patients
 * Validates inputs, checks for duplicates, and creates patient profiles transactionally.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Patient", "Create");

  const body = await req.json();
  const validated = ValidationService.validate(PatientFormSchema, body);

  const result = await PatientService.createPatient(
    validated,
    reqContext.employee.id,
    reqContext.employee.hospitalId
  );

  return result;
});
