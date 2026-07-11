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

  const record = await prisma.iPDHandover.create({
    data: {
      ipdAdmissionId: id,
      recipientUserId: body.recipientUserId,
      conditionSummary: body.conditionSummary,
      checklist: body.checklist,
      remarks: body.remarks || null,
      recordedBy: reqContext.employee.name,
    },
    include: {
      recipientUser: true,
    },
  });

  await prisma.iPDTimelineEvent.create({
    data: {
      ipdAdmissionId: id,
      eventType: "HANDOVER",
      description: `Shift handover logged. Oncoming Recipient: ${record.recipientUser.name}`,
      recordedBy: reqContext.employee.name,
    },
  });

  return record;
});
