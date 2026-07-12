import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import { PrintData } from "@/print-engine/types";

/**
 * GET /api/billing/invoices/[id]/print
 * Returns structured PrintData configurations for financial printing.
 */
export const GET = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Billing", "Print");

  const { id } = await (context.params as Promise<{ id: string }>);
  const searchParams = req.nextUrl.searchParams;
  const printType = searchParams.get("type") || "invoice"; // "invoice", "receipt", "nodue"

  const invoice = await prisma.invoice.findUnique({
    where: { id, isDeleted: false },
    include: {
      patient: true,
      payments: { where: { isDeleted: false } },
      refunds: { where: { isDeleted: false } },
      depositAllocations: { where: { isDeleted: false } },
      charges: {
        where: { isDeleted: false },
        include: {
          billableCharge: {
            include: {
              chargeCatalog: true,
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    throw new AppError("Invoice record not found.", 404, "NOT_FOUND");
  }

  // Load hospital info
  const hospital = await prisma.hospital.findUnique({
    where: { id: reqContext.employee.hospitalId },
  });
  const hospitalName = hospital?.name || "Shree Ganesha Hospital";
  const hospitalFooter = hospital?.footerText || "Thank you for choosing us.";

  // Calculate patient age
  const birth = new Date(invoice.patient.dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }

  let printData: PrintData;

  if (printType === "nodue") {
    // 1. Verify Patient-Wide No Due eligibility
    const patientId = invoice.patientId;

    // Check outstanding invoices
    const unpaidInvoices = await prisma.invoice.findMany({
      where: {
        patientId,
        paymentStatus: { in: ["PENDING", "PARTIALLY_PAID"] },
        isDeleted: false,
      },
    });

    const hasOutstandingBalance = unpaidInvoices.some(inv => Number(inv.balanceAmount) > 0);
    if (hasOutstandingBalance) {
      throw new AppError(
        "Cannot issue No Due Certificate. Patient has invoices with active outstanding balances.",
        400,
        "OUTSTANDING_BALANCE_EXISTS"
      );
    }

    // Check pending un-invoiced charges
    const pendingChargesCount = await prisma.billableCharge.count({
      where: {
        patientId,
        billingStatus: "PENDING",
        isDeleted: false,
      },
    });

    if (pendingChargesCount > 0) {
      throw new AppError(
        `Cannot issue No Due Certificate. Patient has ${pendingChargesCount} pending charges not yet invoiced.`,
        400,
        "PENDING_CHARGES_EXIST"
      );
    }

    // Compile No Due payload
    printData = {
      title: "No Due Certificate",
      timestamp: new Date().toLocaleString(),
      hospitalName,
      content: {
        "Certificate Number": `NDC-${invoice.invoiceNumber.substring(3)}`,
        "Issue Date": new Date().toLocaleDateString(),
        "Patient Name": invoice.patient.name,
        "UHID": invoice.patient.uhid,
        "Age / Gender": `${age} Years / ${invoice.patient.gender}`,
        "Reference Invoice": invoice.invoiceNumber,
        "Verification Status": "VERIFIED & CLEARED",
        "Remarks": "This is to certify that there are no outstanding financial dues against the above-mentioned patient profile.",
      },
      footer: hospitalFooter,
    };

    // Log Audit
    await logAdminAction({
      action: "NO_DUE_GENERATED",
      resource: "Invoice",
      entityId: id,
      description: `Issued No Due Certificate for patient UHID ${invoice.patient.uhid}.`,
    });

  } else if (printType === "receipt") {
    // Compile Payment Receipt
    const totalPayments = invoice.payments.reduce((acc, curr) => acc + Number(curr.amountPaid), 0);
    const totalRefunds = invoice.refunds.reduce((acc, curr) => acc + Number(curr.amountRefunded), 0);
    
    // Group breakdown text
    const breakdownText = invoice.payments
      .map(p => `${p.paymentMode}: ₹${Number(p.amountPaid).toFixed(2)}`)
      .join(", ");

    printData = {
      title: "Invoice Settlement Receipt",
      timestamp: new Date().toLocaleString(),
      hospitalName,
      content: {
        "Receipt Number": `RCT-${invoice.invoiceNumber.substring(3)}`,
        "Invoice Number": invoice.invoiceNumber,
        "UHID": invoice.patient.uhid,
        "Patient Name": invoice.patient.name,
        "Net Payable": `INR ${Number(invoice.payableAmount).toFixed(2)}`,
        "Total Paid": `INR ${totalPayments.toFixed(2)}`,
        "Refunded": totalRefunds > 0 ? `INR ${totalRefunds.toFixed(2)}` : "None",
        "Payment Mode Breakdown": breakdownText || "Deposits Allocation Only",
        "Outstanding Balance": `INR ${Number(invoice.balanceAmount).toFixed(2)}`,
        "Status": invoice.paymentStatus,
      },
      footer: hospitalFooter,
    };

    // Log Audit
    await logAdminAction({
      action: "PAYMENT_RECEIPT_PRINTED",
      resource: "Invoice",
      entityId: id,
      description: `Generated settlement receipt print for Invoice ${invoice.invoiceNumber}.`,
    });

  } else {
    // Default: compile standard invoice print template
    const itemsMap: Record<string, string> = {};
    invoice.charges.forEach((c, idx) => {
      const b = c.billableCharge;
      itemsMap[`Item ${idx + 1}`] = `${b.chargeCatalog.name} (Qty: ${b.quantity} @ ₹${Number(b.rate).toFixed(0)}) = ₹${Number(b.totalAmount).toFixed(0)}`;
    });

    const totalDeposits = invoice.depositAllocations.reduce((acc, curr) => acc + Number(curr.amountAllocated), 0);

    // Find associated IPD Admission if this is an IPD invoice
    const ipdCharge = invoice.charges.find(c => c.billableCharge.sourceModule === "IPD");
    let ipdAdmission = null;
    if (ipdCharge?.billableCharge.sourceEntityId) {
      ipdAdmission = await prisma.iPDAdmission.findUnique({
        where: { id: ipdCharge.billableCharge.sourceEntityId, isDeleted: false },
        include: {
          bed: { include: { room: { include: { ward: true } } } },
        },
      });
    }

    printData = {
      title: "Invoice Summary Statement",
      timestamp: new Date().toLocaleString(),
      hospitalName,
      content: {
        "Invoice Number": invoice.invoiceNumber,
        "UHID": invoice.patient.uhid,
        "Patient Name": invoice.patient.name,
        "Age / Gender": `${age} Years / ${invoice.patient.gender}`,
        "Age": `${age} Years`,
        "Gender": invoice.patient.gender,
        "Contact Number": invoice.patient.phone,
        "IPD ID": ipdAdmission ? ipdAdmission.ipdId : "",
        "Ward": ipdAdmission ? (ipdAdmission.bed?.room.ward?.name || ipdAdmission.bed?.room.roomType || "") : "",
        "Bed": ipdAdmission ? (ipdAdmission.bed?.bedNumber || "") : "",
        ...itemsMap,
        "Gross Total": `INR ${Number(invoice.totalAmount).toFixed(2)}`,
        "Discount Deductions": Number(invoice.discountAmount) > 0 ? `INR ${Number(invoice.discountAmount).toFixed(2)}` : "None",
        "Net Payable": `INR ${Number(invoice.payableAmount).toFixed(2)}`,
        "Credit Deposits Used": totalDeposits > 0 ? `INR ${totalDeposits.toFixed(2)}` : "None",
        "Cashier Paid Amount": `INR ${Number(invoice.paidAmount).toFixed(2)}`,
        "Remaining Balance Due": `INR ${Number(invoice.balanceAmount).toFixed(2)}`,
        "Invoice Status": invoice.paymentStatus,
      },
      footer: hospitalFooter,
    };

    // Log Audit
    await logAdminAction({
      action: "INVOICE_PRINTED",
      resource: "Invoice",
      entityId: id,
      description: `Generated invoice print slip for Invoice ${invoice.invoiceNumber}.`,
    });
  }

  return printData;
});
