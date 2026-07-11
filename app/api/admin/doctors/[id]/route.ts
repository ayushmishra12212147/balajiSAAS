import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { DoctorFormSchema } from "@/modules/admin/schemas";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import { AppError } from "@/server/errors";

/**
 * PUT /api/admin/doctors/[id]
 * Updates qualifications and consultation fee schedules for a doctor.
 */
export const PUT = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Admin", "ManageUsers");

  const { id } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();
  
  // Exclude password and initial staff variables from doctor updates
  const doctorUpdateSchema = DoctorFormSchema.partial({
    employeeCode: true,
    email: true,
    passwordRaw: true,
    mobileNumber: true,
    joiningDate: true,
    departmentId: true,
  });

  const validated = ValidationService.validate(doctorUpdateSchema, body);

  const before = await prisma.doctor.findUnique({
    where: { id },
  });

  if (!before || before.isDeleted) {
    throw new AppError("Doctor profile record not found", 404, "NOT_FOUND");
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (validated.name) {
      await tx.employee.update({
        where: { id },
        data: { name: validated.name },
      });
    }

    return await tx.doctor.update({
      where: { id },
      data: {
        registrationNumber: validated.registrationNumber,
        qualification: validated.qualification,
        specialization: validated.specialization,
        consultationFee: validated.consultationFee,
        roomNumber: validated.roomNumber,
        dutySchedule: validated.dutySchedule || undefined,
      },
    });
  });

  await logAdminAction({
    action: "DOCTOR_UPDATE",
    resource: "Doctor",
    entityId: id,
    previousState: before,
    newState: updated,
    description: `Updated doctor profile for registration: ${updated.registrationNumber}`,
  });

  return updated;
});
