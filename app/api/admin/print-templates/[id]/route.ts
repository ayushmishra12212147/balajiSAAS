import { NextRequest, NextResponse } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { AppError } from "@/server/errors";
import { z } from "zod";
import { PrintEngineService } from "@/modules/print/services/print-engine-service";

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  pageFormat: z.string().min(1).max(30).optional(),
  layoutJson: z.unknown(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/print-templates/[id]
 * Get detailed template layout definition.
 */
export const GET = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Admin", "ManageTemplates");

  const { id } = await (context as unknown as RouteContext).params;

  const template = await prisma.printTemplate.findFirst({
    where: {
      id,
      OR: [
        { hospitalId: reqContext.employee.hospitalId },
        { isSystemDefault: true },
      ],
      isDeleted: false,
    },
  });

  if (!template) {
    throw new AppError("Print template not found", 404, "NOT_FOUND");
  }

  return template;
});

/**
 * PUT /api/admin/print-templates/[id]
 * Updates a print template. If the template is already published or archived, 
 * this automatically forks it to a new draft version.
 */
export const PUT = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Admin", "ManageTemplates");

  const { id } = await (context as unknown as RouteContext).params;
  const body = await req.json();
  const data = UpdateTemplateSchema.parse(body);

  // Validate layouts structural integrity
  PrintEngineService.validateLayout(data.layoutJson);

  const template = await prisma.printTemplate.findFirst({
    where: {
      id,
      OR: [
        { hospitalId: reqContext.employee.hospitalId },
        { isSystemDefault: true },
      ],
      isDeleted: false,
    },
  });

  if (!template) {
    throw new AppError("Print template not found", 404, "NOT_FOUND");
  }

  // Fork system default template
  if (template.isSystemDefault) {
    const latestTemplate = await prisma.printTemplate.findFirst({
      where: {
        hospitalId: reqContext.employee.hospitalId,
        documentType: template.documentType,
        isDeleted: false,
      },
      orderBy: {
        version: "desc",
      },
    });

    const nextVersion = latestTemplate ? latestTemplate.version + 1 : 1;

    const forkedDraft = await prisma.printTemplate.create({
      data: {
        templateKey: template.templateKey,
        name: data.name || `${template.name} (Customized)`,
        category: template.category,
        pageFormat: data.pageFormat || template.pageFormat,
        orientation: body.orientation || template.orientation,
        margins: body.margins || template.margins,
        copies: body.copies !== undefined ? Number(body.copies) : template.copies,
        language: body.language || template.language,
        documentType: template.documentType,
        layoutJson: data.layoutJson as Prisma.InputJsonValue,
        hospitalId: reqContext.employee.hospitalId,
        status: "DRAFT",
        version: nextVersion,
        isPublished: false,
        isSystemDefault: false,
        createdBy: reqContext.employee.id,
      },
    });

    return NextResponse.json({
      message: "Default template copied and customized.",
      template: forkedDraft,
    }, { status: 201 });
  }

  // Immutable enforcement: If published/archived, fork to new Draft
  if (template.status !== "DRAFT") {
    const latestTemplate = await prisma.printTemplate.findFirst({
      where: {
        hospitalId: reqContext.employee.hospitalId,
        documentType: template.documentType,
        isDeleted: false,
      },
      orderBy: {
        version: "desc",
      },
    });

    const nextVersion = latestTemplate ? latestTemplate.version + 1 : template.version + 1;

    const forkedDraft = await prisma.printTemplate.create({
      data: {
        templateKey: template.templateKey,
        name: data.name || `${template.name} (Copy)`,
        category: template.category,
        pageFormat: data.pageFormat || template.pageFormat,
        orientation: body.orientation || template.orientation,
        margins: body.margins || template.margins,
        copies: body.copies !== undefined ? Number(body.copies) : template.copies,
        language: body.language || template.language,
        documentType: template.documentType,
        layoutJson: data.layoutJson as Prisma.InputJsonValue,
        hospitalId: reqContext.employee.hospitalId,
        status: "DRAFT",
        version: nextVersion,
        isPublished: false,
        createdBy: reqContext.employee.id,
      },
    });

    return NextResponse.json({
      message: "Template layout is immutable. Created a new draft copy.",
      template: forkedDraft,
    }, { status: 201 });
  }

  // Update existing draft directly
  const updated = await prisma.printTemplate.update({
    where: { id },
    data: {
      name: data.name,
      pageFormat: data.pageFormat,
      orientation: body.orientation,
      margins: body.margins,
      copies: body.copies !== undefined ? Number(body.copies) : undefined,
      language: body.language,
      layoutJson: data.layoutJson as Prisma.InputJsonValue,
      updatedBy: reqContext.employee.id,
    },
  });

  return updated;
});

/**
 * DELETE /api/admin/print-templates/[id]
 * Deletes/Archives a print template version.
 */
export const DELETE = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Admin", "ManageTemplates");

  const { id } = await (context as unknown as RouteContext).params;

  const template = await prisma.printTemplate.findFirst({
    where: {
      id,
      hospitalId: reqContext.employee.hospitalId,
      isDeleted: false,
    },
  });

  if (!template) {
    throw new AppError("Print template not found", 404, "NOT_FOUND");
  }

  await prisma.printTemplate.update({
    where: { id },
    data: {
      isDeleted: true,
      status: "ARCHIVED",
      isPublished: false,
      deletedAt: new Date(),
      deletedBy: reqContext.employee.id,
    },
  });

  return { message: "Print template deleted successfully" };
});
