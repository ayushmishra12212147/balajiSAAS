import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import { PrintData } from "@/print-engine/types";

/**
 * GET /api/pharmacy/sales/[id]/print
 * Compiles and returns structured PrintData for Pharmacy Invoice.
 */
export const GET = wrapAuthRoute(async (_req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Pharmacy", "Print");

  const { id } = await (context.params as Promise<{ id: string }>);

  const invoice = await prisma.pharmacyInvoice.findUnique({
    where: { id, isDeleted: false },
    include: {
      recipient: true,
      items: {
        include: {
          medicine: true,
        },
      },
      payments: true,
    },
  });

  if (!invoice) {
    throw new AppError("Sales invoice record not found.", 404, "NOT_FOUND");
  }

  // Fetch hospital
  const hospital = await prisma.hospital.findUnique({
    where: { id: reqContext.employee.hospitalId },
  });
  const hospitalName = hospital?.name || "Shree Ganesha Hospital Pharmacy";
  const hospitalFooter = hospital?.footerText || "Medicines sold are non-refundable unless returned within 3 days.";

  const content: Record<string, unknown> = {
    "Invoice Number": invoice.pharmacyInvoiceNumber,
    "Customer Name": invoice.customerName,
    "Customer Phone": invoice.customerPhone || "N/A",
    "Sale Date & Time": new Date(invoice.createdAt).toLocaleString(),
    "Items Count": invoice.items.length,
    "Subtotal Amount": `₹${Number(invoice.totalAmount).toFixed(2)}`,
    "Discount Value": `₹${Number(invoice.discountAmount).toFixed(2)}`,
    "Net Payable Amount": `₹${Number(invoice.payableAmount).toFixed(2)}`,
    "Split Payment Modes": invoice.payments.map((p) => `${p.paymentMode}: ₹${Number(p.amount).toFixed(2)}`).join(" | "),
    "Billing Cashier": `${invoice.recipient.designation} (${invoice.recipient.employeeCode})`,
  };

  // Add items list in key-value structure
  invoice.items.forEach((item, index) => {
    content[`Item #${index + 1}`] = `${item.medicine.name} (Batch: ${item.batchNumber}) x${item.quantitySold} - ₹${Number(item.totalPrice).toFixed(2)} (GST: ${Number(item.gstPercentage)}%)`;
  });

  const printData: PrintData = {
    title: "Pharmacy Sales Invoice Receipt",
    timestamp: new Date().toLocaleString(),
    hospitalName,
    content,
    footer: hospitalFooter,
  };

  // Log Audit
  await logAdminAction({
    action: "DOCUMENT_PRINTED",
    resource: "PharmacyInvoice",
    entityId: id,
    description: `Printed Pharmacy Invoice: ${invoice.pharmacyInvoiceNumber}`,
  });

  return printData;
});
