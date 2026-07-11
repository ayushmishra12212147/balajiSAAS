import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import { PrintData } from "@/print-engine/types";

/**
 * GET /api/laboratory/orders/[id]/print
 * Compiles structured PrintData for clinical Lab Reports.
 */
export const GET = wrapAuthRoute(async (_req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Laboratory", "Print");

  const { id } = await (context.params as Promise<{ id: string }>);

  const order = await prisma.labTestOrder.findUnique({
    where: { id, isDeleted: false },
    include: {
      patient: true,
      testCatalog: true,
      results: { where: { isDeleted: false } },
      revisions: true,
      orderedByDoctor: {
        include: {
          employee: true,
        },
      },
    },
  });

  if (!order) {
    throw new AppError("Laboratory order not found.", 404, "NOT_FOUND");
  }

  if (order.status !== "COMPLETED") {
    throw new AppError("Cannot print a report for an incomplete test order.", 400, "REPORT_INCOMPLETE");
  }

  // Load hospital info
  const hospital = await prisma.hospital.findUnique({
    where: { id: reqContext.employee.hospitalId },
  });
  const hospitalName = hospital?.name || "Shree Ganesha Hospital";
  const hospitalFooter = hospital?.footerText || "End of Laboratory Report.";

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

  // Generate HTML table rows for results
  const testRows = order.results.map((r) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #000;">${r.parameterName}</td>
      <td style="padding: 8px; border: 1px solid #000; font-weight: bold;">${r.parameterValue}</td>
      <td style="padding: 8px; border: 1px solid #000;">${r.unit || "-"}</td>
      <td style="padding: 8px; border: 1px solid #000;">${r.referenceRange || "-"}</td>
    </tr>
  `).join("");

  // Compile results content matching the template placeholders exactly
  const content: Record<string, unknown> = {
    uhid: order.patient.uhid,
    patientName: order.patient.name,
    age: String(age),
    gender: order.patient.gender,
    doctorName: order.orderedByDoctor.employee.designation,
    reportDate: order.completedAt ? new Date(order.completedAt).toLocaleString() : "N/A",
    labDepartment: order.testCatalog.category,
    labNumber: order.id.substring(0, 8).toUpperCase(),
    testRows: testRows,
    remarks: order.remarks || "No clinical remarks.",
    technicianName: technicianName,
    verifiedByName: verifiedByName,
    reportVersion: `Version ${order.revisions.length + 1}`,
    printDate: new Date().toLocaleString(),
    printedBy: `${reqContext.employee.designation} (${reqContext.employee.employeeCode})`,
  };

  const printData: PrintData = {
    title: "Clinical Laboratory Report",
    timestamp: new Date().toLocaleString(),
    hospitalName,
    content,
    footer: hospitalFooter,
  };

  // Log Audit
  await logAdminAction({
    action: "REPORT_PRINTED",
    resource: "LabTestOrder",
    entityId: id,
    description: `Generated print slip for Lab Report Order ID ${id}.`,
  });

  return printData;
});
