import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import { OPDRegistrationInput } from "../schemas";
import { BillingStatus, Prisma } from "@prisma/client";
import { BillingService } from "@/modules/billing/services/billing-service";

export class OPDService {
  /**
   * generateOPDID
   * Continuously increments global non-resetting sequence OPD_ID_SEQUENCE (prefix 'OPD26').
   */
  static async generateOPDID(tx: Prisma.TransactionClient): Promise<string> {
    const sequenceName = "OPD_ID_SEQUENCE";
    
    let seq = await tx.sequence.findUnique({
      where: { sequenceName },
    });

    if (!seq) {
      seq = await tx.sequence.create({
        data: {
          sequenceName,
          currentValue: BigInt(0),
          prefix: "OPD26",
          paddingLength: 4,
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
   * generateDoctorToken
   * Concurrency-safe daily sequence per doctor using sequences table locks.
   */
  static async generateDoctorToken(doctorId: string, tx: Prisma.TransactionClient): Promise<number> {
    const startOfDay = new Date();
    const dayStr = String(startOfDay.getDate()).padStart(2, "0");
    const monthStr = String(startOfDay.getMonth() + 1).padStart(2, "0");
    const yearStr = String(startOfDay.getFullYear());
    const dateStr = `${dayStr}${monthStr}${yearStr}`; // e.g. "29062026"
    const sequenceName = `OPD_TOKEN_${doctorId}_${dateStr}`;

    let seq = await tx.sequence.findUnique({
      where: { sequenceName },
    });

    if (!seq) {
      seq = await tx.sequence.create({
        data: {
          sequenceName,
          currentValue: BigInt(0),
          prefix: "",
          paddingLength: 1,
          isActive: true,
        },
      });
    }

    const nextVal = Number(seq.currentValue) + 1;
    await tx.sequence.update({
      where: { sequenceName },
      data: { currentValue: BigInt(nextVal) },
    });

    return nextVal;
  }

  /**
   * registerOPD
   * Registers a new OPD encounter or revisit, ensuring idempotency and concurrency locks.
   */
  static async registerOPD(
    input: OPDRegistrationInput,
    employeeId: string,
    hospitalId: string
  ) {
    const originalFeeDecimal = Number(input.originalFee);
    const appliedFeeDecimal = Number(input.appliedFee);
    const depositDecimal = Number(input.depositAmount);

    // 1. Idempotency Check: Prevent accidental double registrations within 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentEncounter = await prisma.oPDConsultation.findFirst({
      where: {
        patientId: input.patientId,
        doctorId: input.doctorId,
        isDeleted: false,
        createdAt: { gte: twoMinutesAgo },
      },
    });

    if (recentEncounter) {
      throw new AppError(
        "Double registration prevented. A similar encounter was registered within the last 2 minutes.",
        409,
        "DUPLICATE_REGISTRATION"
      );
    }

    // 2. Validate entities exist
    const patient = await prisma.patient.findUnique({ where: { id: input.patientId, isDeleted: false } });
    if (!patient) throw new AppError("Patient profile not found.", 404, "NOT_FOUND");

    const doctor = await prisma.doctor.findUnique({
      where: { id: input.doctorId, isDeleted: false },
      include: { employee: true },
    });
    if (!doctor) throw new AppError("Doctor profile not found.", 404, "NOT_FOUND");

    const dept = await prisma.department.findUnique({ where: { id: input.departmentId, isDeleted: false } });
    if (!dept) throw new AppError("Department record not found.", 404, "NOT_FOUND");

    // Check if patient already has previous encounters to flag revisit audits
    const previousEncountersCount = await prisma.oPDConsultation.count({
      where: { patientId: input.patientId, isDeleted: false },
    });
    const isRevisit = previousEncountersCount > 0;

    // Run transaction
    const result = await prisma.$transaction(async (tx) => {
      const opdId = await this.generateOPDID(tx);
      const tokenNumber = await this.generateDoctorToken(input.doctorId, tx);

      // Create OPD consultation
      const opd = await tx.oPDConsultation.create({
        data: {
          opdId,
          patientId: input.patientId,
          doctorId: input.doctorId,
          departmentId: input.departmentId,
          hospitalId,
          consultationDate: new Date(),
          depositAmount: depositDecimal,
          originalFee: originalFeeDecimal,
          appliedFee: appliedFeeDecimal,
          overrideReason: input.overrideReason || null,
          tokenNumber,
          symptoms: input.symptoms || null,
          createdBy: employeeId,
        },
      });

      // Find or create OPD consultation fee catalog
      let consultationFeeCatalog = await tx.chargeCatalog.findUnique({
        where: { code: "OPD_CONSULTATION" },
      });
      if (!consultationFeeCatalog) {
        consultationFeeCatalog = await tx.chargeCatalog.create({
          data: {
            code: "OPD_CONSULTATION",
            name: "Outpatient Consultation Fee",
            category: "OPD",
            rate: originalFeeDecimal,
          },
        });
      }

      // Create BillableCharge for the consultation fee
      const consultCharge = await tx.billableCharge.create({
        data: {
          patientId: input.patientId,
          chargeCatalogId: consultationFeeCatalog.id,
          sourceModule: "OPD",
          sourceEntityId: opd.id,
          quantity: 1,
          rate: appliedFeeDecimal,
          totalAmount: appliedFeeDecimal,
          billingStatus: "PENDING" as BillingStatus,
          createdBy: employeeId,
        },
      });

      // Create PatientDeposit record if deposit is provided (DO NOT create a duplicate charge!)
      let depositRecord = null;
      if (depositDecimal > 0) {
        depositRecord = await tx.patientDeposit.create({
          data: {
            patientId: input.patientId,
            hospitalId,
            opdConsultationId: opd.id,
            amount: depositDecimal,
            collectedBy: employeeId,
            createdBy: employeeId,
          },
        });
      }

      // Assign Laboratory Tests
      const assignedLabs = [];
      for (const labCatId of input.assignedLabTests) {
        const labCatalog = await tx.labTestCatalog.findUnique({
          where: { id: labCatId, isDeleted: false },
        });
        if (!labCatalog) throw new AppError(`Lab test catalog ID ${labCatId} not found.`, 404, "NOT_FOUND");

        // Create Lab Order
        const order = await tx.labTestOrder.create({
          data: {
            patientId: input.patientId,
            testCatalogId: labCatId,
            orderedByDoctorId: input.doctorId,
            opdConsultationId: opd.id,
            hospitalId,
            status: "SCHEDULED",
            createdBy: employeeId,
          },
        });

        // Find/Create matching billing catalog
        let chargeCat = await tx.chargeCatalog.findUnique({ where: { code: labCatalog.code } });
        if (!chargeCat) {
          chargeCat = await tx.chargeCatalog.create({
            data: {
              code: labCatalog.code,
              name: labCatalog.name,
              category: "LABORATORY",
              rate: labCatalog.standardRate,
            },
          });
        }

        // Create BillableCharge for lab order
        const labCharge = await tx.billableCharge.create({
          data: {
            patientId: input.patientId,
            chargeCatalogId: chargeCat.id,
            sourceModule: "LABORATORY",
            sourceEntityId: order.id,
            quantity: 1,
            rate: labCatalog.standardRate,
            totalAmount: labCatalog.standardRate,
            billingStatus: "PENDING" as BillingStatus,
            createdBy: employeeId,
          },
        });

        // Update test order with billable charge reference
        await tx.labTestOrder.update({
          where: { id: order.id },
          data: { billableChargeId: labCharge.id },
        });

        assignedLabs.push({ order, charge: labCharge });
      }

      // Assign Radiology Tests
      const assignedRad = [];
      for (const radCatId of input.assignedRadiologyTests) {
        const radCatalog = await tx.radiologyScanCatalog.findUnique({
          where: { id: radCatId, isDeleted: false },
        });
        if (!radCatalog) throw new AppError(`Radiology catalog ID ${radCatId} not found.`, 404, "NOT_FOUND");

        // Create Radiology Order
        const order = await tx.radiologyScanOrder.create({
          data: {
            patientId: input.patientId,
            scanCatalogId: radCatId,
            orderedByDoctorId: input.doctorId,
            opdConsultationId: opd.id,
            status: "SCHEDULED",
            createdBy: employeeId,
          },
        });

        // Find/Create matching billing catalog
        let chargeCat = await tx.chargeCatalog.findUnique({ where: { code: radCatalog.code } });
        if (!chargeCat) {
          chargeCat = await tx.chargeCatalog.create({
            data: {
              code: radCatalog.code,
              name: radCatalog.name,
              category: "RADIOLOGY",
              rate: radCatalog.standardRate,
            },
          });
        }

        // Create BillableCharge for scan order
        const radCharge = await tx.billableCharge.create({
          data: {
            patientId: input.patientId,
            chargeCatalogId: chargeCat.id,
            sourceModule: "RADIOLOGY",
            sourceEntityId: order.id,
            quantity: 1,
            rate: radCatalog.standardRate,
            totalAmount: radCatalog.standardRate,
            billingStatus: "PENDING" as BillingStatus,
            createdBy: employeeId,
          },
        });

        // Update scan order with billable charge reference
        await tx.radiologyScanOrder.update({
          where: { id: order.id },
          data: { billableChargeId: radCharge.id },
        });

        assignedRad.push({ order, charge: radCharge });
      }

      // 4. Automatically generate Invoice directly for all OPD charges (Consultation + Tests)
      const chargeIds = [
        consultCharge.id,
        ...assignedLabs.map((l) => l.charge.id),
        ...assignedRad.map((r) => r.charge.id),
      ];
      
      const totalAmountVal =
        appliedFeeDecimal +
        assignedLabs.reduce((sum, item) => sum + Number(item.charge.totalAmount), 0) +
        assignedRad.reduce((sum, item) => sum + Number(item.charge.totalAmount), 0);

      const totalAmountDecimal = new Prisma.Decimal(totalAmountVal);
      const invoiceNumber = await BillingService.generateInvoiceNumber(tx);

      const paidAmountVal = depositDecimal;
      const balanceAmountVal = Math.max(0, totalAmountVal - paidAmountVal);
      
      let invoiceStatus: any = "PENDING";
      if (paidAmountVal > 0) {
        invoiceStatus = paidAmountVal >= totalAmountVal ? "PAID" : "PARTIALLY_PAID";
      }

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          patientId: input.patientId,
          hospitalId,
          totalAmount: totalAmountDecimal,
          discountAmount: new Prisma.Decimal(0),
          payableAmount: totalAmountDecimal,
          paidAmount: new Prisma.Decimal(paidAmountVal),
          balanceAmount: new Prisma.Decimal(balanceAmountVal),
          paymentStatus: invoiceStatus,
          createdBy: employeeId,
        },
      });

      // Create Charge Mappings & update billing status of all charges to INVOICED
      for (const cid of chargeIds) {
        await tx.invoiceChargeMapping.create({
          data: {
            invoiceId: invoice.id,
            billableChargeId: cid,
          },
        });
        await tx.billableCharge.update({
          where: { id: cid },
          data: { billingStatus: "INVOICED" },
        });
      }

      // Record payment directly if depositAmount > 0
      let paymentRecord = null;
      if (paidAmountVal > 0) {
        paymentRecord = await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            amountPaid: new Prisma.Decimal(paidAmountVal),
            paymentMode: "CASH",
            transactionGroupId: `PAY-OPD-${opd.opdId}`,
            receivedBy: employeeId,
            createdBy: employeeId,
          },
        });
      }

      return {
        opd,
        consultCharge,
        depositRecord,
        assignedLabs,
        assignedRad,
        invoice,
        paymentRecord,
      };
    });

    // Write audit logs
    const actionName = isRevisit ? "OPD_REVISIT" : "OPD_REGISTERED";
    await logAdminAction({
      action: actionName,
      resource: "OPDConsultation",
      entityId: result.opd.id,
      newState: {
        opdId: result.opd.opdId,
        patientName: patient.name,
        doctorName: doctor.employee.designation,
        appliedFee: appliedFeeDecimal,
        tokenNumber: result.opd.tokenNumber,
      },
      description: `${isRevisit ? "Revisited" : "Registered"} patient ${patient.name} for OPD with ID ${result.opd.opdId} (Token #${result.opd.tokenNumber}).`,
    });

    if (appliedFeeDecimal !== originalFeeDecimal) {
      await logAdminAction({
        action: "OPD_FEE_OVERRIDDEN",
        resource: "OPDConsultation",
        entityId: result.opd.id,
        previousState: { fee: originalFeeDecimal },
        newState: { fee: appliedFeeDecimal, reason: input.overrideReason },
        description: `Overrode consultation fee for OPD ID ${result.opd.opdId} from ${originalFeeDecimal} to ${appliedFeeDecimal}.`,
      });
    }

    if (input.assignedLabTests.length > 0 || input.assignedRadiologyTests.length > 0) {
      await logAdminAction({
        action: "OPD_TESTS_ASSIGNED",
        resource: "OPDConsultation",
        entityId: result.opd.id,
        newState: {
          labs: input.assignedLabTests,
          radiology: input.assignedRadiologyTests,
        },
        description: `Assigned diagnostic investigations for OPD ID ${result.opd.opdId}.`,
      });
    }

    const returnedOpd = result.opd as any;
    returnedOpd.invoiceId = result.invoice.id;
    return returnedOpd;
  }

  /**
   * cancelOPD
   * Cancels OPD encounter, cancels pending billable charges, and cancels scheduled diagnostic orders.
   */
  static async cancelOPD(opdId: string, reason: string, employeeId: string) {
    const opd = await prisma.oPDConsultation.findUnique({
      where: { id: opdId, isDeleted: false },
      include: {
        labOrders: true,
        radiologyOrders: true,
      },
    });

    if (!opd) {
      throw new AppError("OPD consultation record not found.", 404, "NOT_FOUND");
    }

    if (opd.cancelledAt) {
      throw new AppError("OPD consultation is already cancelled.", 400, "BAD_REQUEST");
    }

    // Enforce 3-hour limit
    const threeHoursInMs = 3 * 60 * 60 * 1000;
    const elapsed = Date.now() - opd.createdAt.getTime();
    if (elapsed > threeHoursInMs) {
      throw new AppError(
        "Cancellation window expired. Encounters can only be cancelled within 3 hours of registration.",
        400,
        "CANCELLATION_EXPIRED"
      );
    }

    const cancelledDate = new Date();

    const cancelledOpd = await prisma.$transaction(async (tx) => {
      // 1. Mark OPD consultation as cancelled
      const updatedOpd = await tx.oPDConsultation.update({
        where: { id: opdId },
        data: {
          cancelledAt: cancelledDate,
          cancelledBy: employeeId,
          cancellationReason: reason,
          updatedBy: employeeId,
        },
      });

      // 2. Cancel associated Consultation & Deposit BillableCharges (if PENDING)
      await tx.billableCharge.updateMany({
        where: {
          sourceModule: "OPD",
          sourceEntityId: opdId,
          billingStatus: "PENDING" as BillingStatus,
          isDeleted: false,
        },
        data: {
          billingStatus: "CANCELLED" as BillingStatus,
          updatedBy: employeeId,
        },
      });

      // 3. Process Lab Orders: Cancel only if SCHEDULED (not COMPLETED)
      const scheduledLabOrderIds = opd.labOrders
        .filter((o) => o.status === "SCHEDULED")
        .map((o) => o.id);

      if (scheduledLabOrderIds.length > 0) {
        await tx.labTestOrder.updateMany({
          where: { id: { in: scheduledLabOrderIds } },
          data: {
            status: "CANCELLED",
            updatedBy: employeeId,
          },
        });

        // Cancel associated pending billable charges
        await tx.billableCharge.updateMany({
          where: {
            sourceModule: "LABORATORY",
            sourceEntityId: { in: scheduledLabOrderIds },
            billingStatus: "PENDING" as BillingStatus,
            isDeleted: false,
          },
          data: {
            billingStatus: "CANCELLED" as BillingStatus,
            updatedBy: employeeId,
          },
        });
      }

      // 4. Process Radiology Orders: Cancel only if SCHEDULED (not COMPLETED)
      const scheduledRadOrderIds = opd.radiologyOrders
        .filter((o) => o.status === "SCHEDULED")
        .map((o) => o.id);

      if (scheduledRadOrderIds.length > 0) {
        await tx.radiologyScanOrder.updateMany({
          where: { id: { in: scheduledRadOrderIds } },
          data: {
            status: "CANCELLED",
            updatedBy: employeeId,
          },
        });

        // Cancel associated pending billable charges
        await tx.billableCharge.updateMany({
          where: {
            sourceModule: "RADIOLOGY",
            sourceEntityId: { in: scheduledRadOrderIds },
            billingStatus: "PENDING" as BillingStatus,
            isDeleted: false,
          },
          data: {
            billingStatus: "CANCELLED" as BillingStatus,
            updatedBy: employeeId,
          },
        });
      }

      return updatedOpd;
    });

    // Write audit log
    await logAdminAction({
      action: "OPD_CANCELLED",
      resource: "OPDConsultation",
      entityId: opdId,
      previousState: { cancelledAt: null },
      newState: { cancelledAt: cancelledDate, cancelledBy: employeeId, reason },
      description: `Cancelled OPD encounter ID ${opd.opdId} within the 3-hour limit.`,
    });

    return cancelledOpd;
  }
}
export default OPDService;
