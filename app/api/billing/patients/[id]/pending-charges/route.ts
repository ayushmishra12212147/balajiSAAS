import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";

/**
 * GET /api/billing/patients/[id]/pending-charges
 * Returns un-invoiced pending billable charges, credit deposits balances, and No Due status.
 */
export const GET = wrapAuthRoute(async (_req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Billing", "View");

  const { id } = await (context.params as Promise<{ id: string }>);

  // Verify Patient exists
  const patient = await prisma.patient.findUnique({
    where: { id, isDeleted: false },
  });

  if (!patient) {
    throw new AppError("Patient profile not found.", 404, "NOT_FOUND");
  }

  // Find all pending charges
  const pendingCharges = await prisma.billableCharge.findMany({
    where: {
      patientId: id,
      billingStatus: "PENDING",
      isDeleted: false,
    },
    include: {
      chargeCatalog: {
        select: {
          name: true,
          code: true,
          category: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate available deposits from ledger
  const deposits = await prisma.patientDeposit.findMany({
    where: {
      patientId: id,
      isRefunded: false,
      isDeleted: false,
    },
    include: {
      allocations: {
        where: { isDeleted: false },
      },
    },
  });

  let totalDepositsBalance = 0;
  deposits.forEach((dep) => {
    const allocatedSum = dep.allocations.reduce((acc, curr) => acc + Number(curr.amountAllocated), 0);
    const available = Number(dep.amount) - allocatedSum;
    if (available > 0) {
      totalDepositsBalance += available;
    }
  });

  // Check if patient has any outstanding balances in generated invoices
  const unpaidInvoices = await prisma.invoice.findMany({
    where: {
      patientId: id,
      paymentStatus: { in: ["PENDING", "PARTIALLY_PAID"] },
      isDeleted: false,
    },
  });
  
  const totalOutstandingBalance = unpaidInvoices.reduce((acc, curr) => acc + Number(curr.balanceAmount), 0);

  // No Due eligibility: outstanding balance is 0 and no pending charges
  const isNoDueEligible = totalOutstandingBalance <= 0 && pendingCharges.length === 0;

  return {
    patientName: patient.name,
    patientUhid: patient.uhid,
    pendingCharges,
    availableDepositBalance: totalDepositsBalance,
    totalOutstandingBalance,
    isNoDueEligible,
  };
});
