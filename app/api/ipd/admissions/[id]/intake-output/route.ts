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

  const record = await prisma.iPDIntakeOutput.create({
    data: {
      ipdAdmissionId: id,
      intakeMl: body.intakeMl ? Number(body.intakeMl) : null,
      intakeType: body.intakeType || null,
      outputMl: body.outputMl ? Number(body.outputMl) : null,
      outputType: body.outputType || null,
      remarks: body.remarks || null,
      recordedBy: reqContext.employee.name,
    },
  });

  const parts = [];
  if (record.intakeMl) parts.push(`Intake: ${record.intakeMl}ml (${record.intakeType})`);
  if (record.outputMl) parts.push(`Output: ${record.outputMl}ml (${record.outputType})`);

  await prisma.iPDTimelineEvent.create({
    data: {
      ipdAdmissionId: id,
      eventType: "INTAKE_OUTPUT",
      description: `Fluid chart updated: ${parts.join(" | ")}`,
      recordedBy: reqContext.employee.name,
    },
  });

  return record;
});
