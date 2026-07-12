import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import {
  InvoiceGenerationInput,
  ReceivePaymentInput,
  RefundInput,
} from "../schemas";
import { BillingStatus, InvoiceStatus, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

export class BillingService {
  /**
   * generateInvoiceNumber
   * Continuous global invoice prefix 'INV26' running number.
   */
  static async generateInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
    const sequenceName = "INVOICE_NO_SEQUENCE";

    let seq = await tx.sequence.findUnique({
      where: { sequenceName },
    });

    if (!seq) {
      seq = await tx.sequence.create({
        data: {
          sequenceName,
          currentValue: BigInt(0),
          prefix: "INV26",
          paddingLength: 6,
          isActive: true,
        },
      });
    }

    const nextVal = Number(seq.currentValue) + 1;
    await tx.sequence.update({
      where: { sequenceName },
      data: { currentValue: BigInt(nextVal) },
    });

    const running = String(nextVal).padStart(seq.paddingLength, "0");
    return `${seq.prefix}${running}`;
  }

  /**
   * generateInvoice
   * Validates selected charges, calculates discounts, applies partial deposits, and generates invoice.
   */
  static async generateInvoice(
    input: InvoiceGenerationInput,
    employeeId: string,
    hospitalId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify and lock every selected BillableCharge
      const charges = await tx.billableCharge.findMany({
        where: {
          id: { in: input.chargeIds },
          isDeleted: false,
        },
      });

      if (charges.length !== input.chargeIds.length) {
        throw new AppError("Some selected billable charges were not found.", 404, "NOT_FOUND");
      }

      // Check if even one charge has already been invoiced
      const unavailableCharge = charges.find((c) => c.billingStatus !== ("PENDING" as BillingStatus));
      if (unavailableCharge) {
        throw new AppError(
          `Charge for '${unavailableCharge.sourceModule}' has already been invoiced or waived. Aborting entire invoice creation.`,
          409,
          "CHARGE_ALREADY_INVOICED"
        );
      }

      // Calculate total amount
      const totalAmount = charges.reduce((acc, curr) => acc + Number(curr.totalAmount), 0);
      const totalAmountDecimal = new Prisma.Decimal(totalAmount);

      // Resolve Discount
      let discountAmount = Number(input.discountAmount) || 0;
      let discountPercentage = Number(input.discountPercentage) || 0;

      if (discountPercentage > 100) {
        throw new AppError("Discount percentage cannot exceed 100%.", 400, "BAD_REQUEST");
      }

      if (discountPercentage > 0) {
        discountAmount = totalAmount * (discountPercentage / 100);
      } else if (discountAmount > 0) {
        discountPercentage = (discountAmount / totalAmount) * 100;
      }

      if (discountAmount > totalAmount) {
        throw new AppError("Discount amount cannot exceed the total charges amount.", 400, "BAD_REQUEST");
      }

      const discountDecimal = new Prisma.Decimal(discountAmount);
      const payableAmount = totalAmount - discountAmount;
      const payableDecimal = new Prisma.Decimal(payableAmount);

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(tx);

      // Create Invoice initial record (will update paymentStatus / balance after deposit allocations)
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          patientId: input.patientId,
          hospitalId,
          totalAmount: totalAmountDecimal,
          discountAmount: discountDecimal,
          discountPercentage: discountPercentage > 0 ? new Prisma.Decimal(discountPercentage) : null,
          discountReason: input.discountReason || null,
          discountApprovedBy: discountAmount > 0 ? employeeId : null,
          payableAmount: payableDecimal,
          paidAmount: new Prisma.Decimal(0.00),
          balanceAmount: payableDecimal,
          paymentStatus: "PENDING" as InvoiceStatus,
          createdBy: employeeId,
        },
      });

      // Create Charge Mapping and update status
      for (const chargeId of input.chargeIds) {
        await tx.invoiceChargeMapping.create({
          data: {
            invoiceId: invoice.id,
            billableChargeId: chargeId,
          },
        });

        await tx.billableCharge.update({
          where: { id: chargeId },
          data: {
            billingStatus: "INVOICED" as BillingStatus,
            updatedBy: employeeId,
          },
        });
      }

      // Deposit Partial Consumption Ledger
      let remainingPayable = payableAmount;
      let totalDepositApplied = 0;

      const deposits = await tx.patientDeposit.findMany({
        where: {
          patientId: input.patientId,
          isRefunded: false,
          isDeleted: false,
        },
        include: {
          allocations: {
            where: { isDeleted: false },
          },
        },
        orderBy: { transactionDate: "asc" }, // First-in, First-out (FIFO) deposit utilization
      });

      for (const dep of deposits) {
        if (remainingPayable <= 0) break;

        const allocatedSum = dep.allocations.reduce((acc: number, curr: { amountAllocated: Prisma.Decimal }) => acc + Number(curr.amountAllocated), 0);
        const availableBalance = Number(dep.amount) - allocatedSum;

        if (availableBalance > 0) {
          const toAllocate = Math.min(availableBalance, remainingPayable);
          await tx.patientDepositAllocation.create({
            data: {
              depositId: dep.id,
              invoiceId: invoice.id,
              amountAllocated: new Prisma.Decimal(toAllocate),
              createdBy: employeeId,
            },
          });

          remainingPayable -= toAllocate;
          totalDepositApplied += toAllocate;
        }
      }

      const finalBalance = Math.max(0, remainingPayable);
      const isSettled = finalBalance <= 0;

      // Update invoice balances and payment status
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          balanceAmount: new Prisma.Decimal(finalBalance),
          paymentStatus: isSettled
            ? ("PAID" as InvoiceStatus)
            : totalDepositApplied > 0
            ? ("PARTIALLY_PAID" as InvoiceStatus)
            : ("PENDING" as InvoiceStatus),
        },
      });

      // Log audit
      await logAdminAction({
        action: "INVOICE_CREATED",
        resource: "Invoice",
        entityId: invoice.id,
        newState: {
          invoiceNumber,
          totalAmount,
          discountAmount,
          payableAmount,
          depositApplied: totalDepositApplied,
          finalBalance,
          paymentStatus: updatedInvoice.paymentStatus,
        },
        description: `Generated invoice ${invoiceNumber} for patient. Total: ₹${totalAmount}, Payable: ₹${payableAmount}, Deposits used: ₹${totalDepositApplied}.`,
      }, tx);

      if (totalDepositApplied > 0) {
        await logAdminAction({
          action: "DEPOSIT_APPLIED",
          resource: "Invoice",
          entityId: invoice.id,
          newState: { depositApplied: totalDepositApplied },
          description: `Applied ₹${totalDepositApplied} from deposits ledger to Invoice ${invoiceNumber}.`,
        }, tx);
      }

      if (discountAmount > 0) {
        await logAdminAction({
          action: "DISCOUNT_APPLIED",
          resource: "Invoice",
          entityId: invoice.id,
          newState: {
            discountAmount,
            discountPercentage,
            reason: input.discountReason,
            approvedBy: employeeId,
          },
          description: `Applied discount of ₹${discountAmount} (${discountPercentage.toFixed(1)}%) to Invoice ${invoiceNumber}.`,
        }, tx);
      }

      return updatedInvoice;
    }, { timeout: 30000 });
  }

  /**
   * receivePayment
   * Register payments, checking for duplicate submissions and mismatch total amounts.
   */
  static async receivePayment(input: ReceivePaymentInput, employeeId: string) {
    // 1. Idempotency Check: Prevent duplicate payment submissions within 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentPayment = await prisma.payment.findFirst({
      where: {
        invoiceId: input.invoiceId,
        amountPaid: new Prisma.Decimal(input.totalAmount),
        createdAt: { gte: twoMinutesAgo },
      },
    });

    if (recentPayment) {
      throw new AppError(
        "A payment with matching invoice and amount was processed within the last 2 minutes. Duplicate submission blocked.",
        409,
        "DUPLICATE_PAYMENT"
      );
    }

    return await prisma.$transaction(async (tx) => {
      // 2. Lock Invoice and verify version (Optimistic locking check)
      const invoice = await tx.invoice.findUnique({
        where: { id: input.invoiceId, isDeleted: false },
      });

      if (!invoice) {
        throw new AppError("Invoice record not found.", 404, "NOT_FOUND");
      }

      if (invoice.version !== input.version) {
        throw new AppError(
          "Concurrency Conflict: This invoice was updated by another cashier. Please refresh details.",
          409,
          "CONCURRENCY_CONFLICT"
        );
      }

      if (invoice.paymentStatus === ("PAID" as InvoiceStatus) || invoice.paymentStatus === ("CANCELLED" as InvoiceStatus)) {
        throw new AppError(
          `Cannot receive payment on an invoice with status ${invoice.paymentStatus}.`,
          400,
          "INVALID_INVOICE_STATUS"
        );
      }

      // Group payments breakdown under a unique transaction ID
      const transactionGroupId = `PAY-${randomUUID().substring(0, 8).toUpperCase()}`;

      // Insert Payments breakdown (Historical records - immutable)
      for (const pm of input.payments) {
        await tx.payment.create({
          data: {
            invoiceId: input.invoiceId,
            amountPaid: new Prisma.Decimal(pm.amount),
            paymentMode: pm.mode,
            transactionReference: pm.reference || null,
            transactionGroupId,
            receivedBy: employeeId,
            createdBy: employeeId,
          },
        });
      }

      // Query payments and calculate balance ledger dynamically
      const payments = await tx.payment.findMany({
        where: { invoiceId: input.invoiceId, isDeleted: false },
      });
      const totalPaidSum = payments.reduce((acc, curr) => acc + Number(curr.amountPaid), 0);

      const refunds = await tx.refund.findMany({
        where: { invoiceId: input.invoiceId, isDeleted: false },
      });
      const totalRefundedSum = refunds.reduce((acc, curr) => acc + Number(curr.amountRefunded), 0);

      const allocations = await tx.patientDepositAllocation.findMany({
        where: { invoiceId: input.invoiceId, isDeleted: false },
      });
      const totalAllocatedSum = allocations.reduce((acc, curr) => acc + Number(curr.amountAllocated), 0);

      // balance = payable - deposits - payments + refunds
      const outstandingBalance = Number(invoice.payableAmount) - totalAllocatedSum - totalPaidSum + totalRefundedSum;
      const finalBalance = Math.max(0, outstandingBalance);

      // Determine Status
      let finalStatus: InvoiceStatus = "PENDING";
      if (finalBalance <= 0) {
        finalStatus = "PAID";
      } else if (totalPaidSum > 0 || totalAllocatedSum > 0) {
        finalStatus = "PARTIALLY_PAID";
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: input.invoiceId },
        data: {
          paidAmount: new Prisma.Decimal(totalPaidSum),
          balanceAmount: new Prisma.Decimal(finalBalance),
          paymentStatus: finalStatus,
          version: invoice.version + 1,
          updatedBy: employeeId,
        },
      });

      // Log audits
      await logAdminAction({
        action: "PAYMENT_RECEIVED",
        resource: "Invoice",
        entityId: invoice.id,
        newState: {
          transactionGroupId,
          amountPaid: input.totalAmount,
          finalBalance,
          paymentStatus: finalStatus,
        },
        description: `Processed payment of ₹${input.totalAmount} on invoice ${invoice.invoiceNumber}. Final status: ${finalStatus}.`,
      });

      return updatedInvoice;
    }, { timeout: 30000 });
  }

  /**
   * processRefund
   * Creates a refund ledger transaction without modifying historical payments.
   */
  static async processRefund(input: RefundInput, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Lock invoice
      const invoice = await tx.invoice.findUnique({
        where: { id: input.invoiceId, isDeleted: false },
      });

      if (!invoice) {
        throw new AppError("Invoice record not found.", 404, "NOT_FOUND");
      }

      // Calculate net payments received
      const payments = await tx.payment.findMany({
        where: { invoiceId: input.invoiceId, isDeleted: false },
      });
      const totalPaidSum = payments.reduce((acc, curr) => acc + Number(curr.amountPaid), 0);

      const refunds = await tx.refund.findMany({
        where: { invoiceId: input.invoiceId, isDeleted: false },
      });
      const totalRefundedSum = refunds.reduce((acc, curr) => acc + Number(curr.amountRefunded), 0);

      const netPayments = totalPaidSum - totalRefundedSum;

      if (input.amount > netPayments) {
        throw new AppError(
          `Refund amount (₹${input.amount}) exceeds total net payments (₹${netPayments}) received on this invoice.`,
          400,
          "INVALID_REFUND_AMOUNT"
        );
      }

      // Create new Refund transaction record (immutable ledger)
      const refund = await tx.refund.create({
        data: {
          invoiceId: input.invoiceId,
          amountRefunded: new Prisma.Decimal(input.amount),
          refundReason: input.reason,
          refundedBy: employeeId,
          createdBy: employeeId,
        },
      });

      const allocations = await tx.patientDepositAllocation.findMany({
        where: { invoiceId: input.invoiceId, isDeleted: false },
      });
      const totalAllocatedSum = allocations.reduce((acc, curr) => acc + Number(curr.amountAllocated), 0);

      const finalRefundedSum = totalRefundedSum + input.amount;
      const outstandingBalance = Number(invoice.payableAmount) - totalAllocatedSum - totalPaidSum + finalRefundedSum;
      
      // If fully refunded, mark status as REFUNDED, else adjust status based on outstanding balances
      const isFullyRefunded = finalRefundedSum >= totalPaidSum;
      const finalStatus = isFullyRefunded
        ? ("REFUNDED" as InvoiceStatus)
        : outstandingBalance <= 0
        ? ("PAID" as InvoiceStatus)
        : ("PARTIALLY_PAID" as InvoiceStatus);

      const updatedInvoice = await tx.invoice.update({
        where: { id: input.invoiceId },
        data: {
          balanceAmount: new Prisma.Decimal(outstandingBalance),
          paymentStatus: finalStatus,
          version: invoice.version + 1,
          updatedBy: employeeId,
        },
      });

      // Log Audit
      await logAdminAction({
        action: "REFUND_CREATED",
        resource: "Invoice",
        entityId: invoice.id,
        newState: {
          refundId: refund.id,
          amountRefunded: input.amount,
          finalStatus,
        },
        description: `Refunded ₹${input.amount} for Invoice ${invoice.invoiceNumber}. Reason: ${input.reason}.`,
      });

      return updatedInvoice;
    }, { timeout: 30000 });
  }

  /**
   * cancelInvoice
   * Restores billable charges and deposit ledgers. Blocks if any payment or refund exists.
   */
  static async cancelInvoice(invoiceId: string, reason: string, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId, isDeleted: false },
        include: {
          charges: true,
        },
      });

      if (!invoice) {
        throw new AppError("Invoice record not found.", 404, "NOT_FOUND");
      }

      if (invoice.paymentStatus === ("CANCELLED" as InvoiceStatus)) {
        throw new AppError("Invoice is already cancelled.", 400, "INVALID_INVOICE_STATUS");
      }

      // Block cancellation if ANY payment or refund exists
      const paymentCount = await tx.payment.count({ where: { invoiceId, isDeleted: false } });
      const refundCount = await tx.refund.count({ where: { invoiceId, isDeleted: false } });

      if (paymentCount > 0 || refundCount > 0) {
        throw new AppError(
          "Invoice cannot be cancelled because payments or refunds have already been processed. Please process a refund instead.",
          400,
          "CANCELLATION_BLOCKED"
        );
      }

      // Mark Invoice as cancelled
      const cancelledInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paymentStatus: "CANCELLED" as InvoiceStatus,
          balanceAmount: new Prisma.Decimal(0.00),
          cancelledAt: new Date(),
          cancelledBy: employeeId,
          cancellationReason: reason,
          version: invoice.version + 1,
          updatedBy: employeeId,
        },
      });

      // Restore linked BillableCharges to PENDING
      const mappedChargeIds = invoice.charges.map((c) => c.billableChargeId);
      if (mappedChargeIds.length > 0) {
        await tx.billableCharge.updateMany({
          where: { id: { in: mappedChargeIds } },
          data: {
            billingStatus: "PENDING" as BillingStatus,
            updatedBy: employeeId,
          },
        });
      }

      // Remove deposit allocations to restore original deposit ledgers
      await tx.patientDepositAllocation.updateMany({
        where: { invoiceId, isDeleted: false },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: employeeId,
        },
      });

      // Log Audit
      await logAdminAction({
        action: "INVOICE_CANCELLED",
        resource: "Invoice",
        entityId: invoiceId,
        newState: { cancelledAt: new Date(), reason },
        description: `Cancelled Invoice ${invoice.invoiceNumber}. Restored charges and deposit credits.`,
      });

      return cancelledInvoice;
    }, { timeout: 30000 });
  }
}
export default BillingService;
