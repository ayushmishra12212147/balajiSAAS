import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import {
  LabResultEntryInput,
  RadiologyReportInput,
} from "../schemas";
import { LaboratoryStatus, RadiologyStatus, BillingStatus, Prisma, PrismaClient } from "@prisma/client";

export class DiagnosticsService {
  /**
   * isChargePaid
   * Verifies if the associated BillableCharge has no outstanding balance.
   * Decoupled from invoice implementation internals.
   */
  static async isChargePaid(chargeId: string, tx: Prisma.TransactionClient | PrismaClient = prisma): Promise<boolean> {
    const charge = await tx.billableCharge.findUnique({
      where: { id: chargeId },
      include: {
        invoices: {
          where: { isDeleted: false },
          include: {
            invoice: true,
          },
        },
      },
    });

    if (!charge) return false;

    // Waived charges are considered cleared
    if (charge.billingStatus === ("WAIVED" as BillingStatus)) {
      return true;
    }

    // Pending/Cancelled charges have outstanding balance
    if (charge.billingStatus === ("PENDING" as BillingStatus) || charge.billingStatus === ("CANCELLED" as BillingStatus)) {
      return false;
    }

    // Invoiced: Check if the linked invoice has zero outstanding balance
    const paidInvoiceMapping = charge.invoices.find(
      (mapping) => Number(mapping.invoice.balanceAmount) === 0 && !mapping.invoice.isDeleted
    );

    return !!paidInvoiceMapping;
  }

  /**
   * collectSample
   * Transitions lab test order status to SAMPLE_COLLECTED, verifying paid balances first.
   */
  static async collectSample(orderId: string, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.labTestOrder.findUnique({
        where: { id: orderId, isDeleted: false },
      });

      if (!order) {
        throw new AppError("Laboratory order not found.", 404, "NOT_FOUND");
      }

      if (order.status !== ("SCHEDULED" as LaboratoryStatus)) {
        throw new AppError(`Cannot collect sample for order in ${order.status} state.`, 400, "INVALID_STATUS");
      }

      // Check payment status on billable charge
      if (order.billableChargeId) {
        const isPaid = await this.isChargePaid(order.billableChargeId, tx);
        if (!isPaid) {
          throw new AppError(
            "Payment outstanding. Please settle the invoice balance before collecting sample.",
            402,
            "PAYMENT_REQUIRED"
          );
        }
      }

      const updatedOrder = await tx.labTestOrder.update({
        where: { id: orderId },
        data: {
          status: "SAMPLE_COLLECTED" as LaboratoryStatus,
          sampleCollectedAt: new Date(),
          sampleCollectedBy: employeeId,
          updatedBy: employeeId,
        },
      });

      // Log Audit
      await logAdminAction({
        action: "SAMPLE_COLLECTED",
        resource: "LabTestOrder",
        entityId: orderId,
        newState: { status: updatedOrder.status, sampleCollectedAt: updatedOrder.sampleCollectedAt },
        description: `Collected clinical sample for Lab Order ID ${orderId}.`,
      });

      return updatedOrder;
    }, { timeout: 30000 });
  }

  /**
   * enterLabResults
   * Saves laboratory result parameters. Logs complete snapshot revisions on report modifications.
   */
  static async enterLabResults(data: LabResultEntryInput, employeeId: string) {
    if (data.technicianId === data.verifiedById) {
      throw new AppError(
        "Verification authority error: Recording technician cannot self-verify report.",
        400,
        "SELF_VERIFICATION_BLOCKED"
      );
    }

    return await prisma.$transaction(async (tx) => {
      const order = await tx.labTestOrder.findUnique({
        where: { id: data.orderId, isDeleted: false },
        include: {
          results: { where: { isDeleted: false } },
          revisions: true,
        },
      });

      if (!order) {
        throw new AppError("Laboratory order not found.", 404, "NOT_FOUND");
      }

      if (order.status === ("CANCELLED" as LaboratoryStatus)) {
        throw new AppError("Cannot record results for a cancelled order.", 400, "ORDER_CANCELLED");
      }

      const isFirstCompletion = order.status !== ("COMPLETED" as LaboratoryStatus);

      // Verify payment on first completion checkout
      if (isFirstCompletion && order.billableChargeId) {
        const isPaid = await this.isChargePaid(order.billableChargeId, tx);
        if (!isPaid) {
          throw new AppError(
            "Payment outstanding. Please settle the invoice balance before completing diagnostics.",
            402,
            "PAYMENT_REQUIRED"
          );
        }
      }

      // Idempotency: If completed and results parameters match exactly, return early
      if (!isFirstCompletion) {
        const isIdentical = data.parameters.every((p) => {
          const matched = order.results.find((r) => r.parameterName === p.name);
          return matched && matched.parameterValue === p.value;
        });

        if (isIdentical && order.remarks === data.remarks && order.technicianId === data.technicianId && order.verifiedById === data.verifiedById) {
          return order; // Idempotent skip
        }

        // EDIT WORKFLOW: Create full snapshot report revision
        const revisionNumber = order.revisions.length + 1;
        const serializedResults = order.results.map((r) => ({
          parameterName: r.parameterName,
          parameterValue: r.parameterValue,
          referenceRange: r.referenceRange,
          unit: r.unit,
        }));

        await tx.labResultRevision.create({
          data: {
            testOrderId: order.id,
            revisionNumber,
            results: serializedResults,
            remarks: order.remarks,
            technicianId: order.technicianId,
            verifiedById: order.verifiedById,
            completedAt: order.completedAt || new Date(),
            completedBy: order.completedBy || employeeId,
            editedBy: employeeId,
          },
        });
      }

      // Save/Update results parameters
      for (const param of data.parameters) {
        await tx.labTestResult.upsert({
          where: {
            testOrderId_parameterName: {
              testOrderId: order.id,
              parameterName: param.name,
            },
          },
          update: {
            parameterValue: param.value,
            referenceRange: param.referenceRange || null,
            unit: param.unit || null,
            status: "FINALIZED",
            updatedBy: employeeId,
          },
          create: {
            testOrderId: order.id,
            parameterName: param.name,
            parameterValue: param.value,
            referenceRange: param.referenceRange || null,
            unit: param.unit || null,
            status: "FINALIZED",
            createdBy: employeeId,
          },
        });
      }

      // Update Order (Keep original Completed Date and Technician)
      const updateData: Prisma.LabTestOrderUpdateInput = {
        status: "COMPLETED" as LaboratoryStatus,
        technicianId: data.technicianId,
        verifiedById: data.verifiedById,
        remarks: data.remarks || null,
        updatedBy: employeeId,
      };

      if (isFirstCompletion) {
        updateData.completedAt = new Date();
        updateData.completedBy = employeeId;
      }

      const updatedOrder = await tx.labTestOrder.update({
        where: { id: order.id },
        data: updateData,
      });

      // Log audits
      await logAdminAction({
        action: isFirstCompletion ? "LAB_TEST_COMPLETED" : "LAB_TEST_EDITED",
        resource: "LabTestOrder",
        entityId: order.id,
        newState: {
          status: updatedOrder.status,
          technicianId: data.technicianId,
          verifiedById: data.verifiedById,
          parametersCount: data.parameters.length,
        },
        description: `${isFirstCompletion ? "Completed" : "Modified results for"} Lab Order ID ${order.id}.`,
      });

      return updatedOrder;
    }, { timeout: 30000 });
  }

  /**
   * enterRadiologyReport
   * Registers radiology scan findings. Logs full report snapshots on modifications.
   */
  static async enterRadiologyReport(data: RadiologyReportInput, employeeId: string) {
    if (data.technicianId === data.verifiedById) {
      throw new AppError(
        "Verification authority error: Recording technician cannot self-verify report.",
        400,
        "SELF_VERIFICATION_BLOCKED"
      );
    }

    return await prisma.$transaction(async (tx) => {
      const order = await tx.radiologyScanOrder.findUnique({
        where: { id: data.orderId, isDeleted: false },
        include: {
          revisions: true,
        },
      });

      if (!order) {
        throw new AppError("Radiology scan order not found.", 404, "NOT_FOUND");
      }

      if (order.status === ("CANCELLED" as RadiologyStatus)) {
        throw new AppError("Cannot record findings for a cancelled scan.", 400, "ORDER_CANCELLED");
      }

      const isFirstCompletion = order.status !== ("COMPLETED" as RadiologyStatus);

      // Verify payment on first completion checkout
      if (isFirstCompletion && order.billableChargeId) {
        const isPaid = await this.isChargePaid(order.billableChargeId, tx);
        if (!isPaid) {
          throw new AppError(
            "Payment outstanding. Please settle the invoice balance before completing scan findings.",
            402,
            "PAYMENT_REQUIRED"
          );
        }
      }

      // Idempotency: Return early if findings match existing ones exactly
      if (!isFirstCompletion && order.findings === data.findings && order.remarks === data.remarks && order.technicianId === data.technicianId && order.verifiedById === data.verifiedById) {
        return order;
      }

      // EDIT WORKFLOW: Create full snapshot findings revision
      if (!isFirstCompletion) {
        const revisionNumber = order.revisions.length + 1;
        await tx.radiologyFindingsRevision.create({
          data: {
            scanOrderId: order.id,
            revisionNumber,
            findings: order.findings || "",
            remarks: order.remarks,
            technicianId: order.technicianId,
            verifiedById: order.verifiedById,
            completedAt: order.completedAt || new Date(),
            completedBy: order.completedBy || employeeId,
            editedBy: employeeId,
          },
        });
      }

      // Update Radiology Scan details (Keep original completedAt/completedBy)
      const updateData: Prisma.RadiologyScanOrderUpdateInput = {
        status: "COMPLETED" as RadiologyStatus,
        findings: data.findings,
        remarks: data.remarks || null,
        technicianId: data.technicianId,
        verifiedById: data.verifiedById,
        updatedBy: employeeId,
      };

      if (isFirstCompletion) {
        updateData.completedAt = new Date();
        updateData.completedBy = employeeId;
      }

      const updatedOrder = await tx.radiologyScanOrder.update({
        where: { id: order.id },
        data: updateData,
      });

      // Log audits
      await logAdminAction({
        action: isFirstCompletion ? "RADIOLOGY_SCAN_COMPLETED" : "RADIOLOGY_SCAN_EDITED",
        resource: "RadiologyScanOrder",
        entityId: order.id,
        newState: {
          status: updatedOrder.status,
          technicianId: data.technicianId,
          verifiedById: data.verifiedById,
        },
        description: `${isFirstCompletion ? "Completed" : "Modified findings for"} Scan Order ID ${order.id}.`,
      });

      return updatedOrder;
    }, { timeout: 30000 });
  }

  /**
   * cancelLabTest
   * Cancels active Laboratory test. Clinical only (does not touch financial records).
   */
  static async cancelLabTest(orderId: string, reason: string, employeeId: string) {
    const order = await prisma.labTestOrder.findUnique({
      where: { id: orderId, isDeleted: false },
    });

    if (!order) {
      throw new AppError("Laboratory order not found.", 404, "NOT_FOUND");
    }

    if (order.status === ("COMPLETED" as LaboratoryStatus)) {
      throw new AppError("Cannot cancel a completed lab test order.", 400, "CANCELLATION_BLOCKED");
    }

    const updated = await prisma.labTestOrder.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED" as LaboratoryStatus,
        cancelledAt: new Date(),
        cancelledBy: employeeId,
        cancellationReason: reason,
        updatedBy: employeeId,
      },
    });

    // Log Audit
    await logAdminAction({
      action: "LAB_TEST_CANCELLED",
      resource: "LabTestOrder",
      entityId: orderId,
      newState: { status: updated.status, reason },
      description: `Cancelled Laboratory order ID ${orderId}.`,
    });

    return updated;
  }

  /**
   * cancelRadiologyScan
   * Cancels active Radiology scan. Clinical only (does not touch financial records).
   */
  static async cancelRadiologyScan(orderId: string, reason: string, employeeId: string) {
    const order = await prisma.radiologyScanOrder.findUnique({
      where: { id: orderId, isDeleted: false },
    });

    if (!order) {
      throw new AppError("Radiology scan order not found.", 404, "NOT_FOUND");
    }

    if (order.status === ("COMPLETED" as RadiologyStatus)) {
      throw new AppError("Cannot cancel a completed radiology scan order.", 400, "CANCELLATION_BLOCKED");
    }

    const updated = await prisma.radiologyScanOrder.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED" as RadiologyStatus,
        cancelledAt: new Date(),
        cancelledBy: employeeId,
        cancellationReason: reason,
        updatedBy: employeeId,
      },
    });

    // Log Audit
    await logAdminAction({
      action: "RADIOLOGY_SCAN_CANCELLED",
      resource: "RadiologyScanOrder",
      entityId: orderId,
      newState: { status: updated.status, reason },
      description: `Cancelled Radiology scan order ID ${orderId}.`,
    });

    return updated;
  }
}
export default DiagnosticsService;
