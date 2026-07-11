import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { DoctorFormSchema } from "@/modules/admin/schemas";
import { EmployeeService } from "@/modules/admin/services/employee-service";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import { AppError } from "@/server/errors";

/**
 * GET /api/admin/doctors
 * Lists all active doctors along with their staff profiles.
 */
export const GET = wrapAuthRoute(async () => {
  const context = RequestContextService.getRequired();
  // Allowed for any authenticated staff member to select doctors for encounters/admissions

  const doctors = await prisma.doctor.findMany({
    where: { 
      isDeleted: false,
      employee: { isActive: true } 
    },
    include: {
      employee: {
        select: {
          name: true,
          employeeCode: true,
          email: true,
          designation: true,
          mobileNumber: true,
          joiningDate: true,
          isActive: true,
          department: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return doctors;
});

/**
 * POST /api/admin/doctors
 * Provisions a doctor in a transaction using EmployeeService.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ManageUsers");

  const body = await req.json();
  const validated = ValidationService.validate(DoctorFormSchema, body);

  const result = await prisma.$transaction(async (tx) => {
    // Generate doctor registration number if not provided
    let finalRegNumber = validated.registrationNumber?.trim();
    if (!finalRegNumber) {
      finalRegNumber = await EmployeeService.generateDoctorRegistrationNumber(tx);
    }

    // Check unique constraints on registrationNumber
    const existingReg = await tx.doctor.findFirst({
      where: { registrationNumber: finalRegNumber, isDeleted: false },
    });

    if (existingReg) {
      throw new AppError(
        `A doctor with registration number '${finalRegNumber}' already exists.`,
        400,
        "BAD_REQUEST"
      );
    }

    // 1. Reuse EmployeeService to create staff record (role is EMPLOYEE, designation is Doctor)
    const employee = await EmployeeService.createEmployee(
      {
        name: validated.name,
        employeeCode: validated.employeeCode,
        email: validated.email,
        passwordRaw: validated.passwordRaw,
        role: "EMPLOYEE",
        designation: "Doctor",
        departmentId: validated.departmentId,
        hospitalId: context.employee.hospitalId,
        mobileNumber: validated.mobileNumber,
        joiningDate: validated.joiningDate,
      },
      tx
    );

    // 2. Create doctor record
    const doctor = await tx.doctor.create({
      data: {
        id: employee.id, // linked 1:1 to Employee.id
        registrationNumber: finalRegNumber,
        qualification: validated.qualification,
        specialization: validated.specialization,
        consultationFee: validated.consultationFee,
        roomNumber: validated.roomNumber || null,
        dutySchedule: validated.dutySchedule || null,
      },
    });

    await logAdminAction({
      action: "DOCTOR_CREATE",
      resource: "Doctor",
      entityId: doctor.id,
      newState: doctor,
      description: `Created doctor profile for staff ${employee.email} (${validated.registrationNumber})`,
    });

    return doctor;
  });

  return result;
});
