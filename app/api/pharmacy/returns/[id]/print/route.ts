import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import { PrintData } from "@/print-engine/types";

/**
 * GET /api/pharmacy/returns/[id]/print
 * Compiles and returns structured PrintData for Sales Return receipt.
 */
export const GET = wrapAuthRoute(async (_req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Pharmacy", "Print");

  const { id } = await (context.params as Promise<{ id: string }>);

  const retObj = await prisma.pharmacyReturn.findUnique({
    where: { id, isDeleted: false },
    include: {
      pharmacyInvoice: true,
      items: {
        include: {
          medicine: true,
        },
      },
    },
  });

  if (!retObj) {
    throw new AppError("Sales return record not found.", 404, "NOT_FOUND");
  }

  // Fetch hospital
  const hospital = await prisma.hospital.findUnique({
    where: { id: reqContext.employee.hospitalId },
  });
  const hospitalName = hospital?.name || "Shree Ganesha Hospital Pharmacy";
  const hospitalFooter = hospital?.footerText || "Return processed clinically.";

  const content: Record<string, unknown> = {
    "Return Number": retObj.returnNumber,
    "Original Invoice": retObj.pharmacyInvoice.pharmacyInvoiceNumber,
    "Customer Name": retObj.pharmacyInvoice.customerName,
    "Return Date & Time": new Date(retObj.createdAt).toLocaleString(),
    "Items Count": retObj.items.length,
    "Total Refunded Amount": `₹${Number(retObj.refundAmount).toFixed(2)}`,
    "Return Reason": retObj.reason,
    "Printed Operator": `${reqContext.employee.designation} (${reqContext.employee.employeeCode})`,
  };

  // Add items list in key-value structure
  retObj.items.forEach((item, index) => {
    content[`Returned Item #${index + 1}`] = `${item.medicine.name} (Batch: ${item.batchNumber}) x${item.quantityReturned} - Refunded ₹${Number(item.totalAmount).toFixed(2)} (Rate: ₹${Number(item.refundRate).toFixed(2)})`;
  });

  const printData: PrintData = {
    title: "Pharmacy Sales Return Receipt",
    timestamp: new Date().toLocaleString(),
    hospitalName,
    content,
    footer: hospitalFooter,
  };

  // Log Audit
  await logAdminAction({
    action: "DOCUMENT_PRINTED",
    resource: "PharmacyReturn",
    entityId: id,
    description: `Printed Pharmacy Sales Return Receipt: ${retObj.returnNumber}`,
  });

  return printData;
});
