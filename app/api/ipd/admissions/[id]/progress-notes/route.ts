import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";

export const POST = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "IPD", "View");

  const { id } = await (context.params as Promise<{ id: string }>);
  const body = await req.json();

  const note = await prisma.iPDProgressNote.create({
    data: {
      ipdAdmissionId: id,
      noteType: body.noteType,
      content: body.content,
      recordedBy: reqContext.employee.name,
    },
  });

  await prisma.iPDTimelineEvent.create({
    data: {
      ipdAdmissionId: id,
      eventType: "NOTE",
      description: `New ${body.noteType} progress note added.`,
      recordedBy: reqContext.employee.name,
    },
  });

  return note;
});

export const PATCH = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "IPD", "View");

  const { id } = await (context.params as Promise<{ id: string }>);
  const body = await req.json();

  const originalNote = await prisma.iPDProgressNote.findUnique({
    where: { id: body.noteId },
  });

  if (!originalNote) {
    throw new AppError("Original note not found", 404, "NOT_FOUND");
  }

  // Deactivate or flag the parent note (we can mark isDeleted: true on the old one, OR keep both but filter by latest version)
  // Let's mark the original note as isDeleted: true to only display the amended version, but keeping it in DB for audit trail!
  await prisma.iPDProgressNote.update({
    where: { id: body.noteId },
    data: { isDeleted: true },
  });

  const amendedNote = await prisma.iPDProgressNote.create({
    data: {
      ipdAdmissionId: id,
      noteType: originalNote.noteType,
      content: body.amendedContent,
      version: originalNote.version + 1,
      isAmended: true,
      amendmentReason: body.amendmentReason,
      parentNoteId: originalNote.id,
      recordedBy: reqContext.employee.name,
    },
  });

  await prisma.iPDTimelineEvent.create({
    data: {
      ipdAdmissionId: id,
      eventType: "NOTE",
      description: `Amended progress note created (Version ${amendedNote.version}). Reason: ${body.amendmentReason}`,
      recordedBy: reqContext.employee.name,
    },
  });

  return amendedNote;
});
