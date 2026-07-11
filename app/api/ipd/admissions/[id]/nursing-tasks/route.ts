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

  const record = await prisma.iPDNursingTask.create({
    data: {
      ipdAdmissionId: id,
      description: body.description,
      scheduledTime: new Date(body.scheduledTime),
      status: "PENDING",
      recordedBy: reqContext.employee.name,
    },
  });

  return record;
});

export const PATCH = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "IPD", "View");

  const body = await req.json();

  const record = await prisma.iPDNursingTask.update({
    where: { id: body.taskId },
    data: {
      status: body.status,
    },
  });

  return record;
});
