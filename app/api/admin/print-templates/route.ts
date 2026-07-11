import { NextRequest, NextResponse } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { PrintEngineService } from "@/modules/print/services/print-engine-service";

const CreateTemplateSchema = z.object({
  templateKey: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  pageFormat: z.string().min(1).max(30),
  documentType: z.string().min(1).max(50),
  layoutJson: z.unknown(),
  category: z.string().optional(),
  orientation: z.string().optional(),
  margins: z.string().optional(),
  copies: z.number().optional(),
  language: z.string().optional(),
});

/**
 * GET /api/admin/print-templates
 * List all print templates grouped by documentType.
 */
export const GET = wrapAuthRoute(async () => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ManageTemplates");

  const templates = await prisma.printTemplate.findMany({
    where: {
      OR: [
        { hospitalId: context.employee.hospitalId },
        { isSystemDefault: true },
      ],
      isDeleted: false,
    },
    orderBy: [
      { documentType: "asc" },
      { version: "desc" },
    ],
  });

  return templates;
});

/**
 * POST /api/admin/print-templates
 * Create a new template version draft.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ManageTemplates");

  const body = await req.json();
  const data = CreateTemplateSchema.parse(body);

  // Structural check using PrintEngine validation
  PrintEngineService.validateLayout(data.layoutJson);

  // Find max version of existing drafts/published templates for this documentType and hospital
  const latestTemplate = await prisma.printTemplate.findFirst({
    where: {
      hospitalId: context.employee.hospitalId,
      documentType: data.documentType,
      isDeleted: false,
    },
    orderBy: {
      version: "desc",
    },
  });

  const nextVersion = latestTemplate ? latestTemplate.version + 1 : 1;

  const newDraft = await prisma.printTemplate.create({
    data: {
      templateKey: data.templateKey,
      name: data.name,
      category: data.category || "General",
      pageFormat: data.pageFormat,
      orientation: data.orientation || "PORTRAIT",
      margins: data.margins || "15mm",
      copies: data.copies || 1,
      language: data.language || "en",
      documentType: data.documentType,
      layoutJson: data.layoutJson as Prisma.InputJsonValue,
      hospitalId: context.employee.hospitalId,
      status: "DRAFT",
      version: nextVersion,
      isPublished: false,
      isSystemDefault: false,
      createdBy: context.employee.id,
    },
  });

  return NextResponse.json(newDraft, { status: 201 });
});
