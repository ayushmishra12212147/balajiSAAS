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

  const round = await prisma.iPDDoctorRound.create({
    data: {
      ipdAdmissionId: id,
      doctorId: body.doctorId,
      condition: body.condition,
      findings: body.findings,
      recommendations: body.recommendations,
      recordedBy: reqContext.employee.name,
    },
    include: {
      doctor: { include: { employee: true } },
    },
  });

  await prisma.iPDTimelineEvent.create({
    data: {
      ipdAdmissionId: id,
      eventType: "ROUND",
      description: `Doctor round conducted by Dr. ${round.doctor.employee.name}. Condition: ${body.condition}`,
      recordedBy: reqContext.employee.name,
    },
  });

  return round;
});
