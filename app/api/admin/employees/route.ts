import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { EmployeeFormSchema } from "@/modules/admin/schemas";
import { EmployeeService } from "@/modules/admin/services/employee-service";

/**
 * GET /api/admin/employees
 * Lists all active and inactive employees (excludes soft-deleted records).
 */
export const GET = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ManageUsers");

  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get("search") || "";

  const employees = await prisma.employee.findMany({
    where: {
      hospitalId: context.employee.hospitalId,
      isDeleted: false,
      OR: search
        ? [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { employeeCode: { contains: search, mode: "insensitive" } },
            { designation: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      email: true,
      role: true,
      designation: true,
      departmentId: true,
      department: {
        select: { name: true },
      },
      mobileNumber: true,
      joiningDate: true,
      isActive: true,
      lockedUntil: true,
      failedLoginCount: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return employees;
});

/**
 * POST /api/admin/employees
 * Provisions a new employee account using EmployeeService.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ManageUsers");

  const body = await req.json();
  const validated = ValidationService.validate(EmployeeFormSchema, body);

  if (!validated.passwordRaw) {
    throw new Error("Password is required to create a new employee");
  }

  const employee = await EmployeeService.createEmployee({
    name: validated.name,
    employeeCode: validated.employeeCode,
    email: validated.email,
    passwordRaw: validated.passwordRaw,
    role: validated.role,
    designation: validated.designation,
    departmentId: validated.departmentId,
    hospitalId: context.employee.hospitalId,
    mobileNumber: validated.mobileNumber,
    joiningDate: validated.joiningDate,
  });

  return employee;
});
