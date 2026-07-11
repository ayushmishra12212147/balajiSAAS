import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import { PrintData } from "@/print-engine/types";

/**
 * GET /api/ot/[id]/print
 * Compiles and returns structured PrintData for various OT documents.
 * Rendering is offloaded entirely to the central Print Engine.
 */
export const GET = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "OT", "Print");

  const { id } = await (context.params as Promise<{ id: string }>);

  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get("type") || "summary"; // "slip" | "summary"

  const ot = await prisma.operationTheater.findUnique({
    where: { id, isDeleted: false },
    include: {
      patient: true,
      department: true,
      primarySurgeon: { include: { employee: true } },
      assistantSurgeon: { include: { employee: true } },
      revisions: { orderBy: { revisionNumber: "desc" } },
    },
  });

  if (!ot) {
    throw new AppError("Operation booking record not found.", 404, "NOT_FOUND");
  }

  // Fetch hospital
  const hospital = await prisma.hospital.findUnique({
    where: { id: reqContext.employee.hospitalId },
  });
  const hospitalName = hospital?.name || "Shree Ganesha Hospital";
  const hospitalFooter = hospital?.footerText || "Operation Theatre Department.";

  let title = "OT Document";
  const content: Record<string, unknown> = {
    "OT ID": ot.otId,
    "Patient Name": ot.patient.name,
    "UHID": ot.patient.uhid,
    "OT Type": ot.operationType,
    "Procedure Name": ot.operationName,
    "Primary Surgeon": ot.primarySurgeon.employee.designation,
    "Department": ot.department.name,
  };

  if (type === "slip") {
    title = "Surgical Registration Slip";
    content["Scheduled Date"] = new Date(ot.scheduledDate).toLocaleString();
    content["Clinical Diagnosis"] = ot.diagnosis;
    content["Assistant Surgeon"] = ot.assistantSurgeon?.employee?.designation || "None";
    content["Status"] = ot.cancelledAt ? "CANCELLED" : ot.completedAt ? "COMPLETED" : "SCHEDULED";
  } else if (type === "summary") {
    title = "Surgical Procedure Summary";
    content["Scheduled Date"] = new Date(ot.scheduledDate).toLocaleString();
    content["Completion Date"] = ot.completedAt ? new Date(ot.completedAt).toLocaleString() : "Not Completed";
    content["Clinical Diagnosis"] = ot.diagnosis;
    content["Remarks / Post-Op Notes"] = ot.remarks || "None";
  } else {
    throw new AppError("Invalid print document type parameter.", 400, "BAD_REQUEST");
  }

  content["Printed Date & Time"] = new Date().toLocaleString();
  content["Printed By Operator"] = `${reqContext.employee.designation} (${reqContext.employee.employeeCode})`;

  const printData: PrintData = {
    title,
    timestamp: new Date().toLocaleString(),
    hospitalName,
    content,
    footer: hospitalFooter,
  };

  // Log Audit
  await logAdminAction({
    action: "OT_PRINTED",
    resource: "OperationTheater",
    entityId: id,
    description: `Printed OT Document: ${title} for OT ID ${ot.otId}`,
  });

  return printData;
});
