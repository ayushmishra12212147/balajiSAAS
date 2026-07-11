import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import { PrintData } from "@/print-engine/types";

/**
 * GET /api/radiology/orders/[id]/print
 * Compiles structured PrintData for clinical Radiology scan findings.
 */
export const GET = wrapAuthRoute(async (_req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Radiology", "Print");

  const { id } = await (context.params as Promise<{ id: string }>);

  const order = await prisma.radiologyScanOrder.findUnique({
    where: { id, isDeleted: false },
    include: {
      patient: true,
      scanCatalog: true,
      revisions: true,
      orderedByDoctor: {
        include: {
          employee: true,
        },
      },
    },
  });

  if (!order) {
    throw new AppError("Radiology scan order not found.", 404, "NOT_FOUND");
  }

  if (order.status !== "COMPLETED") {
    throw new AppError("Cannot print a report for an incomplete scan findings order.", 400, "REPORT_INCOMPLETE");
  }

  // Load hospital info
  const hospital = await prisma.hospital.findUnique({
    where: { id: reqContext.employee.hospitalId },
  });
  const hospitalName = hospital?.name || "Shree Ganesha Hospital";
  const hospitalFooter = hospital?.footerText || "End of Radiology Scan Findings Report.";

  // Calculate patient age
  const birth = new Date(order.patient.dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }

  // Load technician and verifier names
  let technicianName = "Technician";
  let verifiedByName = "Verified Authority";

  if (order.technicianId) {
    const tech = await prisma.employee.findUnique({ where: { id: order.technicianId } });
    if (tech) technicianName = `${tech.designation} (${tech.employeeCode})`;
  }
  if (order.verifiedById) {
    const ver = await prisma.employee.findUnique({ where: { id: order.verifiedById } });
    if (ver) verifiedByName = `${ver.designation} (${ver.employeeCode})`;
  }

  // Compile radiology findings content
  const content: Record<string, unknown> = {
    "UHID": order.patient.uhid,
    "Patient Name": order.patient.name,
    "Age / Gender": `${age} Years / ${order.patient.gender}`,
    "Ordering Doctor": order.orderedByDoctor.employee.designation,
    "Scan Name": order.scanCatalog.name,
    "Category": order.scanCatalog.category,
    "Radiology Order Ref": order.id.substring(0, 8).toUpperCase(),
    "Original Completion": order.completedAt ? new Date(order.completedAt).toLocaleString() : "N/A",
    "Clinical Findings": order.findings || "No findings recorded.",
  };

  if (order.remarks) {
    content["Remarks"] = order.remarks;
  }

  content["Recorded Technician"] = technicianName;
  content["Verified By Authority"] = verifiedByName;
  content["Report Version"] = `Version ${order.revisions.length + 1}`;
  content["Printed Date & Time"] = new Date().toLocaleString();
  content["Printed By Operator"] = `${reqContext.employee.designation} (${reqContext.employee.employeeCode})`;

  const printData: PrintData = {
    title: "Clinical Radiology Report",
    timestamp: new Date().toLocaleString(),
    hospitalName,
    content,
    footer: hospitalFooter,
  };

  // Log Audit
  await logAdminAction({
    action: "REPORT_PRINTED",
    resource: "RadiologyScanOrder",
    entityId: id,
    description: `Generated print slip for Radiology Report Order ID ${id}.`,
  });

  return printData;
});
