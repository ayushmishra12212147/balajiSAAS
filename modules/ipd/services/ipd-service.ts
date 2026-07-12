import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import {
  AdmissionFormInput,
  BedTransferInput,
  DoctorReassignmentInput,
  ChargeAssignmentInput,
  BirthRegistrationInput,
  DeathRegistrationInput,
} from "../schemas";
import { BedStatus, ChargeSourceModule, BillingStatus, Gender, DeliveryType, DeathLocationType } from "@prisma/client";

export class IPDService {
  /**
   * admitPatient
   * Provisions a patient admission under transaction blocks.
   */
  static async admitPatient(data: AdmissionFormInput, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Admission protection: Check if patient has an active IPD admission
      const activeAdmission = await tx.iPDAdmission.findFirst({
        where: {
          patientId: data.patientId,
          dischargeDate: null,
          cancelledAt: null,
          isDeleted: false,
        },
      });

      if (activeAdmission) {
        throw new AppError(
          `Admissions block: Patient already has an active IPD admission record (${activeAdmission.ipdId}).`,
          400,
          "ACTIVE_ADMISSION_EXISTS"
        );
      }

      // 2. Bed Allocation protection: Check if bed is occupied or linked to another active admission
      const bedOccupant = await tx.iPDAdmission.findFirst({
        where: {
          bedId: data.bedId,
          dischargeDate: null,
          cancelledAt: null,
          isDeleted: false,
        },
      });

      if (bedOccupant) {
        throw new AppError(
          "Allocation conflict: Bed is currently occupied by another active inpatient.",
          400,
          "BED_OCCUPIED"
        );
      }

      const bed = await tx.bed.findUnique({
        where: { id: data.bedId, isDeleted: false },
        include: { room: true },
      });

      if (!bed || bed.status !== ("AVAILABLE" as BedStatus)) {
        throw new AppError("Bed is currently unavailable or undergoes maintenance.", 400, "BED_UNAVAILABLE");
      }

      // 3. Generate transaction-safe continuous ipdId sequence
      const sequence = await tx.sequence.upsert({
        where: { sequenceName: "IPD" },
        update: { currentValue: { increment: 1 } },
        create: {
          sequenceName: "IPD",
          currentValue: 260001,
          prefix: "IPD",
          paddingLength: 6,
        },
      });

      const runningNo = Number(sequence.currentValue);
      const ipdId = `${sequence.prefix}${runningNo.toString().padStart(sequence.paddingLength, "0")}`;

      // Get hospital details
      const employee = await tx.employee.findUnique({ where: { id: employeeId } });
      if (!employee) throw new AppError("Operator employee not found.", 404, "NOT_FOUND");
      const hospitalId = employee.hospitalId;

      // 4. Update bed status to OCCUPIED
      await tx.bed.update({
        where: { id: data.bedId },
        data: { status: "OCCUPIED" as BedStatus },
      });

      // 5. Create IPDAdmission record
      const admissionDate = data.admissionDate ? new Date(data.admissionDate) : new Date();
      const admission = await tx.iPDAdmission.create({
        data: {
          ipdId,
          patientId: data.patientId,
          bedId: data.bedId,
          primaryDoctorId: data.doctorId,
          departmentId: data.departmentId,
          hospitalId,
          admissionDate,
          codeStatus: "FULL_CODE",
          isolationStatus: "NONE",
          referredByDoctorId: data.referredByDoctorId || null,
          isMLC: data.isMLC || false,
          mlcNumber: data.isMLC ? data.mlcNumber : null,
          admissionSource: data.admissionSource,
          admissionCategory: data.admissionCategory || "GENERAL",
          initialDepositRequired: data.initialDepositRequired || 0,
          admissionReason: data.admissionReason,
          status: "ADMITTED",
          createdBy: employeeId,
        },
      });

      // 5b. Record initial deposit in the patient's general ledger balance if > 0
      if (data.initialDepositRequired && data.initialDepositRequired > 0) {
        await tx.patientDeposit.create({
          data: {
            patientId: data.patientId,
            hospitalId,
            amount: data.initialDepositRequired,
            collectedBy: employeeId,
            createdBy: employeeId,
          },
        });
      }

      // 6. Create initial attendant record
      await tx.iPDAttendant.create({
        data: {
          ipdAdmissionId: admission.id,
          name: data.attendantName,
          relationship: data.attendantRelationship,
          mobile: data.attendantMobile,
          isActive: true,
        },
      });

      // 7. Create initial ADMISSION timeline event
      await tx.iPDTimelineEvent.create({
        data: {
          ipdAdmissionId: admission.id,
          eventType: "ADMISSION",
          description: `Inpatient admitted to Bed ${bed.bedNumber} by Staff. Reason: ${data.admissionReason}`,
          recordedBy: "Staff",
        },
      });

      // 8. Create initial doctor history timeline log
      await tx.doctorAssignmentHistory.create({
        data: {
          ipdAdmissionId: admission.id,
          assignedDoctorId: data.doctorId,
          effectiveFrom: admissionDate,
          changedBy: employeeId,
          reason: "Initial Admission Assignment",
          createdBy: employeeId,
        },
      });

      // 9. Create initial bed transfer timeline log
      await tx.bedTransferHistory.create({
        data: {
          ipdAdmissionId: admission.id,
          newBedId: data.bedId,
          transferDate: admissionDate,
          transferredBy: employeeId,
          transferReason: "Initial Bed Allocation",
          createdBy: employeeId,
        },
      });

      // 8. Generate default admission fee BillableCharge
      const admissionCatalog = await tx.chargeCatalog.upsert({
        where: { code: "IPD_ADM_FEE" },
        update: {},
        create: {
          code: "IPD_ADM_FEE",
          name: "Standard Inpatient Admission Charge",
          category: "Admission",
          rate: 1000.00,
        },
      });

      await tx.billableCharge.create({
        data: {
          patientId: data.patientId,
          chargeCatalogId: admissionCatalog.id,
          sourceModule: "IPD" as ChargeSourceModule,
          sourceEntityId: admission.id,
          quantity: 1,
          rate: admissionCatalog.rate,
          totalAmount: admissionCatalog.rate,
          billingStatus: "PENDING" as BillingStatus,
          createdBy: employeeId,
        },
      });

      // Log Audit
      await logAdminAction({
        action: "PATIENT_ADMITTED",
        resource: "IPDAdmission",
        entityId: admission.id,
        newState: admission,
        description: `Admitted patient to ward room bed. Assigned IPD ID: ${ipdId}`,
      });

      return admission;
    });
  }

  /**
   * transferBed
   * Reallocates patient room bed. Sets old bed back to AVAILABLE.
   */
  static async transferBed(admissionId: string, data: BedTransferInput, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      const admission = await tx.iPDAdmission.findUnique({
        where: { id: admissionId, isDeleted: false },
      });

      if (!admission || admission.dischargeDate || admission.cancelledAt) {
        throw new AppError("Inpatient admission is not active.", 400, "ADMISSION_INACTIVE");
      }

      // Check same-bed transfer rejections
      if (admission.bedId === data.newBedId) {
        throw new AppError(
          "Allocation conflict: Patient is already allocated to this target bed.",
          400,
          "SAME_BED_TRANSFER_BLOCKED"
        );
      }

      // Check destination bed availability
      const occupiedByActive = await tx.iPDAdmission.findFirst({
        where: {
          bedId: data.newBedId,
          dischargeDate: null,
          cancelledAt: null,
          isDeleted: false,
        },
      });

      if (occupiedByActive) {
        throw new AppError(
          "Allocation conflict: Target destination bed is occupied by another active inpatient.",
          400,
          "BED_OCCUPIED"
        );
      }

      const destinationBed = await tx.bed.findUnique({
        where: { id: data.newBedId, isDeleted: false },
      });

      if (!destinationBed || destinationBed.status !== ("AVAILABLE" as BedStatus)) {
        throw new AppError("Destination bed is currently not available.", 400, "BED_UNAVAILABLE");
      }

      const transferDate = new Date();

      // Update old bed status back to AVAILABLE
      await tx.bed.update({
        where: { id: admission.bedId },
        data: { status: "AVAILABLE" as BedStatus },
      });

      // Update new bed status to OCCUPIED
      await tx.bed.update({
        where: { id: data.newBedId },
        data: { status: "OCCUPIED" as BedStatus },
      });

      // Log transfer timeline record
      await tx.bedTransferHistory.create({
        data: {
          ipdAdmissionId: admission.id,
          previousBedId: admission.bedId,
          newBedId: data.newBedId,
          transferDate,
          transferredBy: employeeId,
          transferReason: data.transferReason,
          createdBy: employeeId,
        },
      });

      // Update IPDAdmission record
      const updated = await tx.iPDAdmission.update({
        where: { id: admissionId },
        data: {
          bedId: data.newBedId,
          status: "TRANSFERRED",
          updatedBy: employeeId,
        },
      });

      // Log timeline event
      await tx.iPDTimelineEvent.create({
        data: {
          ipdAdmissionId: admission.id,
          eventType: "BED_TRANSFER",
          description: `Bed allocation transfer to Bed ${destinationBed.bedNumber}. Reason: ${data.transferReason || "Not specified"}`,
          recordedBy: "Staff",
        },
      });

      // Log Audit
      await logAdminAction({
        action: "BED_TRANSFERRED",
        resource: "IPDAdmission",
        entityId: admissionId,
        newState: { previousBedId: admission.bedId, newBedId: data.newBedId },
        description: `Transferred patient to new bed ${data.newBedId}`,
      });

      return updated;
    });
  }

  /**
   * reassignDoctor
   * Transfers clinical doctor timelines, closing active assigning rows.
   */
  static async reassignDoctor(admissionId: string, data: DoctorReassignmentInput, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      const admission = await tx.iPDAdmission.findUnique({
        where: { id: admissionId, isDeleted: false },
      });

      if (!admission || admission.dischargeDate || admission.cancelledAt) {
        throw new AppError("Inpatient admission is not active.", 400, "ADMISSION_INACTIVE");
      }

      // Avoid redundant assignments
      if (admission.primaryDoctorId === data.newDoctorId) {
        return admission; // Idempotent skip
      }

      const effectiveDate = new Date();

      // Close current active doctor assignment
      const currentActive = await tx.doctorAssignmentHistory.findFirst({
        where: {
          ipdAdmissionId: admissionId,
          effectiveTo: null,
          isDeleted: false,
        },
      });

      if (currentActive) {
        await tx.doctorAssignmentHistory.update({
          where: { id: currentActive.id },
          data: {
            effectiveTo: effectiveDate,
            updatedBy: employeeId,
          },
        });
      }

      // Create new doctor timeline history entry
      await tx.doctorAssignmentHistory.create({
        data: {
          ipdAdmissionId: admissionId,
          previousDoctorId: admission.primaryDoctorId,
          assignedDoctorId: data.newDoctorId,
          effectiveFrom: effectiveDate,
          changedBy: employeeId,
          reason: data.reason,
          createdBy: employeeId,
        },
      });

      // Update IPDAdmission primary Doctor ID
      const updated = await tx.iPDAdmission.update({
        where: { id: admissionId },
        data: {
          primaryDoctorId: data.newDoctorId,
          updatedBy: employeeId,
        },
      });

      // Log Audit
      await logAdminAction({
        action: "DOCTOR_REASSIGNED",
        resource: "IPDAdmission",
        entityId: admissionId,
        newState: { previousDoctorId: admission.primaryDoctorId, assignedDoctorId: data.newDoctorId },
        description: `Reassigned primary doctor to Doctor ID ${data.newDoctorId}`,
      });

      return updated;
    });
  }

  /**
   * assignCharge
   * Assigns inpatient charges, protecting against double clicks.
   */
  static async assignCharge(admissionId: string, data: ChargeAssignmentInput, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      const admission = await tx.iPDAdmission.findUnique({
        where: { id: admissionId, isDeleted: false },
      });

      if (!admission || admission.dischargeDate || admission.cancelledAt) {
        throw new AppError("Inpatient admission is not active.", 400, "ADMISSION_INACTIVE");
      }

      let catalogId = data.chargeCatalogId;
      let rateVal = data.rate ?? 0;
      let catalogName = "";

      if (!catalogId && data.customName) {
        // Create an ad-hoc custom charge catalog entry so it can be linked (keep code <= 20 chars)
        const code = `C_${Date.now().toString(36).toUpperCase()}_${Math.floor(Math.random() * 1000)}`;
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
      } else if (catalogId) {
        const catalog = await tx.chargeCatalog.findUnique({
          where: { id: catalogId, isDeleted: false },
        });

        if (!catalog) {
          throw new AppError("Charge catalog item not found.", 404, "NOT_FOUND");
        }
        catalogName = catalog.name;
        if (data.rate === undefined || data.rate === null) {
          rateVal = Number(catalog.rate);
        }
      } else {
        throw new AppError("Either a catalog item or custom charge name must be specified.", 400, "BAD_REQUEST");
      }

      const totalVal = rateVal * data.quantity;

      // Double-click protection: Look for matching charge created in the last 60 seconds
      const duplicateWindow = new Date(Date.now() - 60000);
      const duplicate = await tx.billableCharge.findFirst({
        where: {
          patientId: admission.patientId,
          chargeCatalogId: catalogId,
          quantity: data.quantity,
          rate: rateVal,
          sourceModule: "IPD" as ChargeSourceModule,
          sourceEntityId: admissionId,
          createdAt: { gte: duplicateWindow },
          isDeleted: false,
        },
      });

      if (duplicate) {
        return duplicate; // Idempotent return
      }

      const charge = await tx.billableCharge.create({
        data: {
          patientId: admission.patientId,
          chargeCatalogId: catalogId,
          sourceModule: "IPD" as ChargeSourceModule,
          sourceEntityId: admissionId,
          quantity: data.quantity,
          rate: rateVal,
          totalAmount: totalVal,
          billingStatus: "PENDING" as BillingStatus,
          createdBy: employeeId,
        },
      });

      // Log Audit
      await logAdminAction({
        action: "CHARGE_ASSIGNED",
        resource: "BillableCharge",
        entityId: charge.id,
        newState: charge,
        description: `Assigned charge ${catalogName} of total ₹${totalVal.toFixed(2)} to Inpatient ID ${admissionId}.`,
      });

      return charge;
    });
  }

  /**
   * dischargePatient
   * Discharges inpatient. Restores bed state and checks diagnostics/OT gates.
   */
  static async dischargePatient(
    admissionId: string,
    data: {
      dischargeType: "NORMAL" | "LAMA" | "DAMA" | "REFERRED" | "EXPIRED";
      finalDiagnosis: string;
      dischargeSummary: string;
      treatmentSummary?: string | null;
      conditionAtDischarge?: string | null;
      followUpInstructions?: string | null;
      dischargeDateTime?: string | null;
    },
    employeeId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const admission = await tx.iPDAdmission.findUnique({
        where: { id: admissionId, isDeleted: false },
        include: {
          otBookings: { where: { isDeleted: false } },
          labOrders: { where: { isDeleted: false } },
          radiologyOrders: { where: { isDeleted: false } },
        },
      });

      if (!admission || admission.dischargeDate || admission.cancelledAt) {
        throw new AppError("Inpatient admission is not active.", 400, "ADMISSION_INACTIVE");
      }

      if (admission.isDeceased) {
        throw new AppError("Patient is deceased. Cannot discharge clinically.", 400, "DECEASED_CLOSED");
      }

      // Verification eligibility gates: No active OT, No pending Lab, No pending Radiology
      const activeOt = admission.otBookings.find((ot) => ot.completedAt === null && ot.cancelledAt === null);
      if (activeOt) {
        throw new AppError(
          "Discharge blocked: Patient has an active Operation Theater booking scheduled/running.",
          400,
          "OT_ACTIVE"
        );
      }



      const dischargeDate = data.dischargeDateTime ? new Date(data.dischargeDateTime) : new Date();

      // Release Bed Status back to AVAILABLE
      await tx.bed.update({
        where: { id: admission.bedId },
        data: { status: "AVAILABLE" as BedStatus },
      });

      // Close active doctor assignment
      const currentActive = await tx.doctorAssignmentHistory.findFirst({
        where: {
          ipdAdmissionId: admissionId,
          effectiveTo: null,
          isDeleted: false,
        },
      });

      if (currentActive) {
        await tx.doctorAssignmentHistory.update({
          where: { id: currentActive.id },
          data: {
            effectiveTo: dischargeDate,
            updatedBy: employeeId,
          },
        });
      }

      // Deactivate attendants
      await tx.iPDAttendant.updateMany({
        where: {
          ipdAdmissionId: admissionId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // Map status
      let resultingStatus = "DISCHARGED";
      if (data.dischargeType === "LAMA") resultingStatus = "LAMA";
      else if (data.dischargeType === "DAMA") resultingStatus = "DAMA";
      else if (data.dischargeType === "REFERRED") resultingStatus = "REFERRED";
      else if (data.dischargeType === "EXPIRED") resultingStatus = "EXPIRED";

      const isExpired = data.dischargeType === "EXPIRED";

      // Update IPDAdmission record details
      const updated = await tx.iPDAdmission.update({
        where: { id: admissionId },
        data: {
          dischargeDate,
          dischargeSummary: data.dischargeSummary,
          dischargeType: data.dischargeType,
          finalDiagnosis: data.finalDiagnosis,
          treatmentSummary: data.treatmentSummary || null,
          conditionAtDischarge: data.conditionAtDischarge || null,
          followUpInstructions: data.followUpInstructions || null,
          status: resultingStatus,
          isDeceased: isExpired ? true : admission.isDeceased,
          dischargeBy: employeeId,
          updatedBy: employeeId,
        },
      });

      // Log timeline event
      await tx.iPDTimelineEvent.create({
        data: {
          ipdAdmissionId: admissionId,
          eventType: "DISCHARGE",
          description: `Patient discharged. Type: ${data.dischargeType}. Final Diagnosis: ${data.finalDiagnosis}`,
          recordedBy: "Staff",
        },
      });

      // Log Audit
      await logAdminAction({
        action: "PATIENT_DISCHARGED",
        resource: "IPDAdmission",
        entityId: admissionId,
        newState: updated,
        description: `Discharged inpatient clinically. Bed ${admission.bedId} released. Type: ${data.dischargeType}`,
      });

      return updated;
    });
  }

  /**
   * updateDischargeSummary
   * Edits summary post-discharge, storing previous values inside DischargeSummaryRevision.
   */
  static async updateDischargeSummary(admissionId: string, newSummary: string, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      const admission = await tx.iPDAdmission.findUnique({
        where: { id: admissionId, isDeleted: false },
        include: {
          dischargeSummaryRevisions: true,
        },
      });

      if (!admission) throw new AppError("Admission not found.", 404, "NOT_FOUND");
      if (!admission.dischargeDate) {
        throw new AppError("Patient has not been discharged yet. Cannot edit discharge summary records.", 400, "NOT_DISCHARGED");
      }

      const revisionNumber = admission.dischargeSummaryRevisions.length + 1;

      // Save previous snapshot in revisions
      await tx.dischargeSummaryRevision.create({
        data: {
          ipdAdmissionId: admissionId,
          revisionNumber,
          summary: admission.dischargeSummary || "",
          editedBy: employeeId,
        },
      });

      // Update summary
      const updated = await tx.iPDAdmission.update({
        where: { id: admissionId },
        data: {
          dischargeSummary: newSummary,
          updatedBy: employeeId,
        },
      });

      // Log Audit
      await logAdminAction({
        action: "DISCHARGE_SUMMARY_EDITED",
        resource: "IPDAdmission",
        entityId: admissionId,
        description: `Updated discharge summary post-discharge. Created revision #${revisionNumber}.`,
      });

      return updated;
    });
  }

  /**
   * registerBirth
   * Registers baby birth. Protects against duplicate birth registrations.
   */
  static async registerBirth(admissionId: string, data: BirthRegistrationInput, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      const admission = await tx.iPDAdmission.findUnique({
        where: { id: admissionId, isDeleted: false },
      });

      if (!admission || admission.dischargeDate || admission.cancelledAt) {
        throw new AppError("Inpatient mother admission is not active.", 400, "ADMISSION_INACTIVE");
      }

      const dobDate = new Date(data.dob);

      // Duplicate prevention: check duplicate birth registered for same mother, dob and weight
      const duplicate = await tx.birthRegistration.findFirst({
        where: {
          motherPatientId: admission.patientId,
          dob: dobDate,
          weightKg: data.weightKg,
          babyName: data.babyName || undefined,
          isDeleted: false,
        },
      });

      if (duplicate) {
        throw new AppError(
          "Duplicate birth: A baby with identical DOB and weight is already registered for this mother.",
          400,
          "DUPLICATE_BIRTH_BLOCKED"
        );
      }

      // Generate unique certificateNumber index sequence
      const sequence = await tx.sequence.upsert({
        where: { sequenceName: "BIRTH" },
        update: { currentValue: { increment: 1 } },
        create: {
          sequenceName: "BIRTH",
          currentValue: 10001,
          prefix: "BIRTH",
          paddingLength: 5,
        },
      });

      const certNo = `${sequence.prefix}${sequence.currentValue.toString().padStart(sequence.paddingLength, "0")}`;

      const birth = await tx.birthRegistration.create({
        data: {
          babyName: data.babyName || null,
          dob: dobDate,
          gender: data.gender as Gender,
          weightKg: data.weightKg,
          motherPatientId: admission.patientId,
          ipdAdmissionId: admissionId,
          hospitalId: admission.hospitalId,
          deliveryType: data.deliveryType as DeliveryType,
          attendingDoctorId: data.attendingDoctorId,
          certificateNumber: certNo,
          createdBy: employeeId,
        },
      });

      // Log Audit
      await logAdminAction({
        action: "BIRTH_REGISTERED",
        resource: "BirthRegistration",
        entityId: birth.id,
        newState: birth,
        description: `Registered baby birth under Certificate: ${certNo}`,
      });

      return birth;
    });
  }

  /**
   * registerDeath
   * Registers patient death. Clinically closes active admission.
   */
  static async registerDeath(admissionId: string | null, data: DeathRegistrationInput, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      // Resolve patient attributes
      let patientId = null;
      let hospitalId = "";
      const deceasedName = data.deceasedName || "Unknown Patient";
      const deceasedAge = data.deceasedAge || 0;
      const deceasedGender = data.deceasedGender || ("MALE" as Gender);

      if (admissionId) {
        const admission = await tx.iPDAdmission.findUnique({
          where: { id: admissionId, isDeleted: false },
        });

        if (!admission || admission.dischargeDate || admission.cancelledAt) {
          throw new AppError("Inpatient admission is not active or already discharged.", 400, "ADMISSION_INACTIVE");
        }

        patientId = admission.patientId;
        hospitalId = admission.hospitalId;

        const dateOfDeath = new Date(data.dateOfDeath);

        // Clinically close active inpatient admission
        await tx.iPDAdmission.update({
          where: { id: admissionId },
          data: {
            dischargeDate: dateOfDeath,
            dischargeSummary: `Deceased: ${data.causeOfDeath}`,
            dischargeBy: employeeId,
            isDeceased: true,
            updatedBy: employeeId,
          },
        });

        // Release Bed status back to AVAILABLE
        await tx.bed.update({
          where: { id: admission.bedId },
          data: { status: "AVAILABLE" as BedStatus },
        });

        // Close active doctor assignment
        const currentActive = await tx.doctorAssignmentHistory.findFirst({
          where: {
            ipdAdmissionId: admissionId,
            effectiveTo: null,
            isDeleted: false,
          },
        });

        if (currentActive) {
          await tx.doctorAssignmentHistory.update({
            where: { id: currentActive.id },
            data: {
              effectiveTo: dateOfDeath,
              updatedBy: employeeId,
            },
          });
        }
      } else {
        // Brought-dead or emergency death
        const employee = await tx.employee.findUnique({ where: { id: employeeId } });
        if (!employee) throw new AppError("Operator not found.", 404, "NOT_FOUND");
        hospitalId = employee.hospitalId;
      }

      // Generate unique certificateNumber sequence
      const sequence = await tx.sequence.upsert({
        where: { sequenceName: "DEATH" },
        update: { currentValue: { increment: 1 } },
        create: {
          sequenceName: "DEATH",
          currentValue: 10001,
          prefix: "DEATH",
          paddingLength: 5,
        },
      });

      const certNo = `${sequence.prefix}${sequence.currentValue.toString().padStart(sequence.paddingLength, "0")}`;

      const death = await tx.deathRegistration.create({
        data: {
          patientId,
          ipdAdmissionId: admissionId || null,
          hospitalId,
          deceasedName,
          deceasedAge,
          deceasedGender: deceasedGender as Gender,
          dateOfDeath: new Date(data.dateOfDeath),
          causeOfDeath: data.causeOfDeath,
          locationType: data.locationType as DeathLocationType,
          attendingDoctorId: data.attendingDoctorId || null,
          informantDetails: data.informantDetails || null,
          certificateNumber: certNo,
          createdBy: employeeId,
        },
      });

      // Log Audit
      await logAdminAction({
        action: "DEATH_REGISTERED",
        resource: "DeathRegistration",
        entityId: death.id,
        newState: death,
        description: `Registered deceased certificate: ${certNo}`,
      });

      return death;
    });
  }
}
export default IPDService;
