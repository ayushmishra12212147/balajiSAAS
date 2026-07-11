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

  const result = await prisma.$transaction(async (tx) => {
    // 1. Deactivate old attendants
    await tx.iPDAttendant.updateMany({
      where: {
        ipdAdmissionId: id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // 2. Create new active attendant
    const attendant = await tx.iPDAttendant.create({
      data: {
        ipdAdmissionId: id,
        name: body.name,
        relationship: body.relationship,
        mobile: body.mobile,
        isActive: true,
      },
    });

    // 3. Log timeline event
    await tx.iPDTimelineEvent.create({
      data: {
        ipdAdmissionId: id,
        eventType: "ATTENDANT_SWAP",
        description: `Primary attendant swapped. New Attendant: ${body.name} (${body.relationship})`,
        recordedBy: reqContext.employee.name,
      },
    });

    return attendant;
  });

  return result;
});
