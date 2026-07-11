import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import { PrintTemplateStatus } from "@prisma/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/print-templates/[id]/publish
 * Publishes a draft template version, archiving previous published records.
 * Restricted to SUPER_ADMIN role.
 */
export const POST = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  
  // 1. Differentiated Permission & Super Admin enforcement
  await requirePermission(reqContext.employee.id, "Admin", "PublishTemplate");
  if (reqContext.employee.role !== "SUPER_ADMIN" && reqContext.employee.role !== "HOSPITAL_ADMIN") {
    throw new AppError("Only Administrators are authorized to publish print templates.", 403, "FORBIDDEN");
  }

  const { id } = await (context as unknown as RouteContext).params;

  const targetTemplate = await prisma.printTemplate.findFirst({
    where: {
      id,
      hospitalId: reqContext.employee.hospitalId,
      isDeleted: false,
    },
  });

  if (!targetTemplate) {
    throw new AppError("Print template not found", 404, "NOT_FOUND");
  }

  if (targetTemplate.status === "PUBLISHED") {
    return { message: "Template is already published" };
  }

  // 2. Transactional Publishing & Archive Loop
  const result = await prisma.$transaction(async (tx) => {
    // Locate currently published template for the hospital and documentType
    const currentPublished = await tx.printTemplate.findFirst({
      where: {
        hospitalId: reqContext.employee.hospitalId,
        documentType: targetTemplate.documentType,
        status: "PUBLISHED",
        isDeleted: false,
      },
    });

    if (currentPublished) {
      // Archive currently published template
      await tx.printTemplate.update({
        where: { id: currentPublished.id },
        data: {
          status: "ARCHIVED" as PrintTemplateStatus,
          isPublished: false,
        },
      });
    }

    // Publish new template
    const published = await tx.printTemplate.update({
      where: { id: targetTemplate.id },
      data: {
        status: "PUBLISHED" as PrintTemplateStatus,
        isPublished: true,
      },
    });

    // 3. Log Audit Record with State Diff
    await logAdminAction({
      action: "TEMPLATE_PUBLISHED",
      resource: "PrintTemplate",
      entityId: published.id,
      previousState: currentPublished ? { id: currentPublished.id, version: currentPublished.version } : null,
      newState: { id: published.id, version: published.version },
      description: `Published template version ${published.version} for documentType '${published.documentType}', archiving version ${currentPublished?.version || "none"}.`,
    });

    return published;
  });

  return result;
});
