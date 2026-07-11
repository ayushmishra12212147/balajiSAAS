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

  const order = await prisma.iPDTreatmentOrder.create({
    data: {
      ipdAdmissionId: id,
      orderType: body.orderType,
      priority: body.priority || "ROUTINE",
      description: body.description,
      status: "PENDING",
      recordedBy: reqContext.employee.name,
    },
  });

  await prisma.iPDTimelineEvent.create({
    data: {
      ipdAdmissionId: id,
      eventType: "ORDER",
      description: `New treatment order placed: [${body.orderType}] Priority ${body.priority || "ROUTINE"}. Desc: ${body.description}`,
      recordedBy: reqContext.employee.name,
    },
  });

  return order;
});

export const PATCH = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "IPD", "View");

  const { id } = await (context.params as Promise<{ id: string }>);
  const body = await req.json();

  if (body.action === "VERIFY") {
    const order = await prisma.iPDTreatmentOrder.update({
      where: { id: body.orderId },
      data: {
        isVerified: true,
        verifiedBy: reqContext.employee.name,
        verifiedAt: new Date(),
      },
    });

    await prisma.iPDTimelineEvent.create({
      data: {
        ipdAdmissionId: id,
        eventType: "ORDER",
        description: `Treatment order verified by ${reqContext.employee.name}`,
        recordedBy: reqContext.employee.name,
      },
    });

    return order;
  }

  if (body.action === "UPDATE_STATUS") {
    const order = await prisma.iPDTreatmentOrder.update({
      where: { id: body.orderId },
      data: {
        status: body.status,
      },
    });

    await prisma.iPDTimelineEvent.create({
      data: {
        ipdAdmissionId: id,
        eventType: "ORDER",
        description: `Treatment order status changed to ${body.status}`,
        recordedBy: reqContext.employee.name,
      },
    });

    return order;
  }

  return { success: false };
});
