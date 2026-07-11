import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";

export const POST = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "IPD", "View");

  const { id } = await (context.params as Promise<{ id: string }>);
  const body = await req.json();

  const record = await prisma.iPDConsultation.create({
    data: {
      ipdAdmissionId: id,
      targetDepartmentId: body.targetDepartmentId,
      targetDoctorId: body.targetDoctorId || null,
      reason: body.reason,
      urgency: body.urgency || "ROUTINE",
      status: "REQUESTED",
      recordedBy: reqContext.employee.name,
    },
    include: {
      targetDepartment: true,
      targetDoctor: { include: { employee: true } },
    },
  });

  const doctorName = record.targetDoctor ? `Dr. ${record.targetDoctor.employee.name}` : "Any Doctor";
  await prisma.iPDTimelineEvent.create({
    data: {
      ipdAdmissionId: id,
      eventType: "CONSULT",
      description: `Consultation requested: Department ${record.targetDepartment.name} (${doctorName}). Reason: ${body.reason}`,
      recordedBy: reqContext.employee.name,
    },
  });

  return record;
});

export const PATCH = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "IPD", "View");

  const { id } = await (context.params as Promise<{ id: string }>);
  const body = await req.json();

  const record = await prisma.iPDConsultation.update({
    where: { id: body.consultId },
    data: {
      status: body.status,
      completionNotes: body.completionNotes || null,
    },
  });

  await prisma.iPDTimelineEvent.create({
    data: {
      ipdAdmissionId: id,
      eventType: "CONSULT",
      description: `Consultation request marked as ${body.status}. Completion notes: ${body.completionNotes || "None"}`,
      recordedBy: reqContext.employee.name,
    },
  });

  return record;
});
