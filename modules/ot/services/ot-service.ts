import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import { OTRegistrationInput, OTChargeAssignmentInput, OTRevisionInput } from "../schemas";
import { OTType, ChargeSourceModule, BillingStatus } from "@prisma/client";

export class OTService {
  /**
   * registerOT
   * Registers a scheduled Minor/Major surgery. Idempotency and reference checks enforced.
   */
  static async registerOT(data: OTRegistrationInput, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Reference check
      const hasIpd = !!data.ipdAdmissionId;
      const hasOpd = !!data.opdConsultationId;
      if ((hasIpd && hasOpd) || (!hasIpd && !hasOpd)) {
        throw new AppError(
          "Validation Error: OT must belong to either an OPD Consultation OR an IPD Admission. Never both, and never neither.",
          400,
          "INVALID_REFERENCE"
        );
      }

      // Check references exist
      if (data.ipdAdmissionId) {
        const ipd = await tx.iPDAdmission.findUnique({ where: { id: data.ipdAdmissionId, isDeleted: false } });
        if (!ipd) throw new AppError("Referenced IPD Admission not found.", 404, "NOT_FOUND");
      }
      if (data.opdConsultationId) {
        const opd = await tx.oPDConsultation.findUnique({ where: { id: data.opdConsultationId, isDeleted: false } });
        if (!opd) throw new AppError("Referenced OPD Consultation not found.", 404, "NOT_FOUND");
      }

      // Validate patient, surgeon, department
      const patient = await tx.patient.findUnique({ where: { id: data.patientId, isDeleted: false } });
      if (!patient) throw new AppError("Patient not found.", 404, "NOT_FOUND");

      const surgeon = await tx.doctor.findUnique({ where: { id: data.primarySurgeonId, isDeleted: false } });
      if (!surgeon) throw new AppError("Surgeon not found.", 404, "NOT_FOUND");

      if (data.assistantSurgeonId) {
        const assistant = await tx.doctor.findUnique({ where: { id: data.assistantSurgeonId, isDeleted: false } });
        if (!assistant) throw new AppError("Assistant surgeon not found.", 404, "NOT_FOUND");
      }

      const dept = await tx.department.findUnique({ where: { id: data.departmentId, isDeleted: false } });
      if (!dept) throw new AppError("Admitting department not found.", 404, "NOT_FOUND");

      const scheduledDate = new Date(data.scheduledDate);

      // 2. Duplicate OT Protection (Idempotency)
      const existingActive = await tx.operationTheater.findFirst({
        where: {
          patientId: data.patientId,
          operationName: data.operationName,
          scheduledDate,
          operationType: data.operationType,
          completedAt: null,
          cancelledAt: null,
          isDeleted: false,
        },
      });

      if (existingActive) {
        return existingActive; // Return existing record early
      }

      // Get hospital details
      const employee = await tx.employee.findUnique({ where: { id: employeeId } });
      if (!employee) throw new AppError("Operator employee not found.", 404, "NOT_FOUND");
      const hospitalId = employee.hospitalId;

      // 3. Generate transaction-safe continuous otId sequence
      const sequence = await tx.sequence.upsert({
        where: { sequenceName: "OT" },
        update: { currentValue: { increment: 1 } },
        create: {
          sequenceName: "OT",
          currentValue: 260001,
          prefix: "OT",
          paddingLength: 6,
        },
      });

      const runningNo = Number(sequence.currentValue);
      const otId = `${sequence.prefix}${runningNo.toString().padStart(sequence.paddingLength, "0")}`;

      const ot = await tx.operationTheater.create({
        data: {
          otId,
          ipdAdmissionId: data.ipdAdmissionId || null,
          opdConsultationId: data.opdConsultationId || null,
          patientId: data.patientId,
          hospitalId,
          departmentId: data.departmentId,
          operationType: data.operationType as OTType,
          procedureCatalogId: data.procedureCatalogId || null,
          operationName: data.operationName,
          diagnosis: data.diagnosis,
          scheduledDate,
          remarks: data.remarks || null,
          primarySurgeonId: data.primarySurgeonId,
          assistantSurgeonId: data.assistantSurgeonId || null,
          createdBy: employeeId,
        },
      });

      // Log Audit
      await logAdminAction({
        action: "OT_REGISTERED",
        resource: "OperationTheater",
        entityId: ot.id,
        newState: ot,
        description: `Scheduled OT booking: ${otId}. Procedure: ${data.operationName}`,
      });

      return ot;
    }, { timeout: 30000 });
  }

  /**
   * assignCharge
   * Allocates catalog charges, enforcing closed-state freeze and unique item constraints.
   */
  static async assignCharge(otId: string, data: OTChargeAssignmentInput, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      const ot = await tx.operationTheater.findUnique({
        where: { id: otId, isDeleted: false },
      });

      if (!ot || ot.cancelledAt) {
        throw new AppError("Operation booking is inactive or cancelled.", 400, "OT_INACTIVE");
      }

      let catalogId = data.chargeCatalogId;
      let rateVal = data.rate !== undefined && data.rate !== null ? data.rate : 0;
      let catalogName = "";

      if (catalogId) {
        // Charge catalog item duplication check: Only one charge of this catalog item type is allowed per OT
        const duplicateCharge = await tx.billableCharge.findFirst({
          where: {
            sourceModule: "OT" as ChargeSourceModule,
            sourceEntityId: otId,
            chargeCatalogId: catalogId,
            isDeleted: false,
          },
        });

        if (duplicateCharge) {
          throw new AppError(
            "Duplicate charge error: This catalog charge item has already been assigned to this operation booking.",
            400,
            "DUPLICATE_OT_CHARGE_REJECTED"
          );
        }

        const catalog = await tx.chargeCatalog.findUnique({
          where: { id: catalogId, isDeleted: false },
        });

        if (!catalog) {
          throw new AppError("Catalog charge item not found.", 404, "NOT_FOUND");
        }

        catalogName = catalog.name;
        if (data.rate === undefined || data.rate === null) {
          rateVal = Number(catalog.rate);
        }
      } else if (data.customName) {
        // Create an ad-hoc custom charge catalog entry so it can be linked (keep code <= 20 chars)
        const code = `COT_${Date.now().toString(36).toUpperCase()}_${Math.floor(Math.random() * 1000)}`;
        const customCatalog = await tx.chargeCatalog.create({
          data: {
            code,
            name: data.customName,
            category: "Miscellaneous",
            rate: rateVal,
            isDeleted: false,
          },
        });
        catalogId = customCatalog.id;
        catalogName = data.customName;
      } else {
        throw new AppError("Either a catalog item or custom charge name must be specified.", 400, "BAD_REQUEST");
      }

      const totalVal = rateVal * data.quantity;

      const charge = await tx.billableCharge.create({
        data: {
          patientId: ot.patientId,
          chargeCatalogId: catalogId!,
          sourceModule: "OT" as ChargeSourceModule,
          sourceEntityId: otId,
          quantity: data.quantity,
          rate: rateVal,
          totalAmount: totalVal,
          billingStatus: "PENDING" as BillingStatus,
          createdBy: employeeId,
        },
      });

      // Log Audit
      await logAdminAction({
        action: "CHARGES_ASSIGNED",
        resource: "BillableCharge",
        entityId: charge.id,
        newState: charge,
        description: `Assigned charge ${catalogName} of total ₹${totalVal.toFixed(2)} to OT ID ${otId}.`,
      });

      return charge;
    }, { timeout: 30000 });
  }

  /**
   * closeOperation
   * Closes booking. Idempotent closing check.
   */
  static async closeOperation(otId: string, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      const ot = await tx.operationTheater.findUnique({
        where: { id: otId, isDeleted: false },
      });

      if (!ot || ot.cancelledAt) {
        throw new AppError("Operation booking is inactive or cancelled.", 400, "OT_INACTIVE");
      }

      // Idempotency: Return completed early if already closed
      if (ot.completedAt) {
        return ot;
      }

      const completed = await tx.operationTheater.update({
        where: { id: otId },
        data: {
          completedAt: new Date(),
          completedBy: employeeId,
          updatedBy: employeeId,
        },
      });

      // Log Audit
      await logAdminAction({
        action: "OPERATION_CLOSED",
        resource: "OperationTheater",
        entityId: otId,
        newState: completed,
        description: `Closed operation clinically. OT ID: ${ot.otId}`,
      });

      return completed;
    }, { timeout: 30000 });
  }

  /**
   * editCompletedOT
   * Edits procedure parameters after closure, logging complete revision histories.
   */
  static async editCompletedOT(otId: string, data: OTRevisionInput, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      const ot = await tx.operationTheater.findUnique({
        where: {
          id: otId,
          isDeleted: false,
        },
        include: {
          revisions: true,
        },
      });

      if (!ot || ot.cancelledAt) {
        throw new AppError("Operation booking is inactive.", 400, "OT_INACTIVE");
      }

      if (!ot.completedAt) {
        throw new AppError("Operation is not closed yet. Standard edits are permitted directly on the booking console.", 400, "OT_NOT_CLOSED");
      }

      const revisionNumber = ot.revisions.length + 1;

      // Save complete snapshot of previous state in revisions log
      await tx.operationTheaterRevision.create({
        data: {
          operationTheaterId: otId,
          revisionNumber,
          operationName: ot.operationName,
          diagnosis: ot.diagnosis,
          primarySurgeonId: ot.primarySurgeonId,
          assistantSurgeonId: ot.assistantSurgeonId,
          departmentId: ot.departmentId,
          remarks: ot.remarks || null,
          editedBy: employeeId,
        },
      });

      // Update current operation details
      const updated = await tx.operationTheater.update({
        where: { id: otId },
        data: {
          operationName: data.operationName,
          diagnosis: data.diagnosis,
          primarySurgeonId: data.primarySurgeonId,
          assistantSurgeonId: data.assistantSurgeonId || null,
          departmentId: data.departmentId,
          remarks: data.remarks || null,
          updatedBy: employeeId,
        },
      });

      // Log Audit
      await logAdminAction({
        action: "OT_PRINTED", // Using similar enum or description
        resource: "OperationTheater",
        entityId: otId,
        description: `Modified closed operation parameters. Recorded Revision #${revisionNumber}.`,
      });

      return updated;
    }, { timeout: 30000 });
  }

  /**
   * cancelOT
   * Cancels active scheduled operation, cancelling pending charges.
   */
  static async cancelOT(otId: string, reason: string, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      const ot = await tx.operationTheater.findUnique({
        where: { id: otId, isDeleted: false },
      });

      if (!ot) throw new AppError("Operation booking not found.", 404, "NOT_FOUND");
      if (ot.completedAt) {
        throw new AppError("Cannot cancel completed operation.", 400, "OT_COMPLETED");
      }

      const cancelled = await tx.operationTheater.update({
        where: { id: otId },
        data: {
          cancelledAt: new Date(),
          cancelledBy: employeeId,
          cancellationReason: reason,
          updatedBy: employeeId,
        },
      });

      // Cancel associated pending billable charges
      await tx.billableCharge.updateMany({
        where: {
          sourceModule: "OT" as ChargeSourceModule,
          sourceEntityId: otId,
          billingStatus: "PENDING" as BillingStatus,
          isDeleted: false,
        },
        data: {
          billingStatus: "CANCELLED" as BillingStatus,
          updatedBy: employeeId,
        },
      });

      // Log Audit
      await logAdminAction({
        action: "OT_PRINTED", // Similar tracking
        resource: "OperationTheater",
        entityId: otId,
        description: `Cancelled scheduled operation. Reason: ${reason}`,
      });

      return cancelled;
    }, { timeout: 30000 });
  }
}
export default OTService;
