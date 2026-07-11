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

  const record = await prisma.iPDClinicalAttachment.create({
    data: {
      ipdAdmissionId: id,
      documentType: body.documentType,
      fileUrl: body.fileUrl,
      description: body.description || null,
      recordedBy: reqContext.employee.name,
    },
  });

  await prisma.iPDTimelineEvent.create({
    data: {
      ipdAdmissionId: id,
      eventType: "ATTACHMENT",
      description: `New clinical attachment uploaded: [${body.documentType}] ${body.description || ""}`,
      recordedBy: reqContext.employee.name,
    },
  });

  return record;
});
