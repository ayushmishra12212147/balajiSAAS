import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import { PatientFormOutput } from "../schemas";
import { Prisma } from "@prisma/client";

export interface DuplicateMatch {
  patient: {
    id: string;
    uhid: string;
    name: string;
    phone: string;
    dob: Date;
    gender: string;
    city?: string;
  };
  reason: "Aadhaar Match" | "Phone Match" | "Name + DOB Match";
}

export class PatientService {
  /**
   * checkPotentialDuplicates
   * Scans for matches by Aadhaar, Phone, or (Name + DOB) and returns structured duplicate reasons.
   */
  static async checkPotentialDuplicates(
    data: {
      name: string;
      phone: string;
      dob: Date;
      aadhaarNumber?: string | null;
    },
    excludePatientId?: string
  ): Promise<DuplicateMatch[]> {
    const duplicates: DuplicateMatch[] = [];

    // 1. Aadhaar Match
    if (data.aadhaarNumber && data.aadhaarNumber.trim() !== "") {
      const match = await prisma.patient.findFirst({
        where: {
          aadhaarNumber: data.aadhaarNumber,
          isDeleted: false,
          NOT: excludePatientId ? { id: excludePatientId } : undefined,
        },
        select: { id: true, uhid: true, name: true, phone: true, dob: true, gender: true },
      });
      if (match) {
        duplicates.push({
          patient: match,
          reason: "Aadhaar Match",
        });
      }
    }

    // 2. Phone Match
    if (data.phone) {
      const matches = await prisma.patient.findMany({
        where: {
          phone: data.phone,
          isDeleted: false,
          NOT: excludePatientId ? { id: excludePatientId } : undefined,
        },
        select: { id: true, uhid: true, name: true, phone: true, dob: true, gender: true },
      });
      matches.forEach((m) => {
        duplicates.push({
          patient: m,
          reason: "Phone Match",
        });
      });
    }

    // 3. Name + DOB Match
    if (data.name && data.dob) {
      const matches = await prisma.patient.findMany({
        where: {
          name: { equals: data.name.trim(), mode: "insensitive" },
          dob: data.dob,
          isDeleted: false,
          NOT: excludePatientId ? { id: excludePatientId } : undefined,
        },
        select: { id: true, uhid: true, name: true, phone: true, dob: true, gender: true },
      });
      matches.forEach((m) => {
        // Prevent duplicate results if phone or Aadhaar already matched this record
        if (!duplicates.some((d) => d.patient.id === m.id)) {
          duplicates.push({
            patient: m,
            reason: "Name + DOB Match",
          });
        }
      });
    }

    return duplicates;
  }

  /**
   * generateUHID
   * Formats sequence locks per day in DDMMYY layout (e.g. SGH29062600001).
   */
  static async generateUHID(hospitalId: string, tx: Prisma.TransactionClient): Promise<string> {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    const dateStr = `${day}${month}${year}`; // e.g. "290626"
    const sequenceName = `PATIENT_UHID_${dateStr}`;

    const hospital = await tx.hospital.findUnique({
      where: { id: hospitalId },
      select: { code: true },
    });
    const hospitalCode = hospital?.code || "HOSP";

    let seq = await tx.sequence.findUnique({
      where: { sequenceName },
    });

    if (!seq) {
      seq = await tx.sequence.create({
        data: {
          sequenceName,
          currentValue: BigInt(0),
          prefix: "",
          paddingLength: 5,
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
    return `${hospitalCode}${dateStr}${running}`;
  }

  /**
   * createPatient
   * Registers a patient profile transactionally. Enforces duplicate warnings checking.
   */
  static async createPatient(
    input: PatientFormOutput,
    employeeId: string,
    hospitalId: string
  ) {
    const dobDate = new Date(input.dob);
    const aadhaar = input.aadhaarNumber && input.aadhaarNumber.trim() !== "" ? input.aadhaarNumber : null;

    // Check duplicate warnings
    if (!input.confirmDuplicate) {
      const duplicates = await this.checkPotentialDuplicates({
        name: input.name,
        phone: input.phone,
        dob: dobDate,
        aadhaarNumber: aadhaar,
      });

      if (duplicates.length > 0) {
        return { duplicateDetected: true, duplicates };
      }
    }

    // Execute Patient creations inside a transaction block
    const result = await prisma.$transaction(async (tx) => {
      const uhid = await this.generateUHID(hospitalId, tx);

      // Create Patient core record
      const patient = await tx.patient.create({
        data: {
          uhid,
          name: input.name,
          phone: input.phone,
          alternatePhone: input.alternatePhone || null,
          email: input.email || null,
          dob: dobDate,
          gender: input.gender,
          bloodGroup: input.bloodGroup || null,
          aadhaarNumber: aadhaar,
          occupation: input.occupation || null,
          photoUrl: input.photoUrl || null,
          maritalStatus: input.maritalStatus || null,
          nationality: input.nationality,
          remarks: input.remarks || null,
          hospitalId,
          createdBy: employeeId,
        },
      });

      // Create Patient Address
      await tx.patientAddress.create({
        data: {
          patientId: patient.id,
          addressLine: input.addressLine?.trim() || "Not Provided",
          city: input.city?.trim() || "N/A",
          state: input.state?.trim() || "N/A",
          pincode: input.pincode?.trim() || "000000",
          createdBy: employeeId,
        },
      });

      // Create Emergency Contact
      await tx.patientEmergencyContact.create({
        data: {
          patientId: patient.id,
          name: input.emergencyContactName?.trim() || "N/A",
          phone: input.emergencyContactPhone?.trim() || "0000000000",
          relation: input.emergencyContactRelation?.trim() || "N/A",
          createdBy: employeeId,
        },
      });

      // Create Referral Entry
      await tx.patientReferral.create({
        data: {
          patientId: patient.id,
          referralType: input.referralType || "SELF",
          referralName: input.referralName || "Self",
          referralNotes: input.referralNotes || null,
          createdBy: employeeId,
        },
      });

      return patient;
    }, { timeout: 30000 });

    // Write audit logs
    const duplicatesBypassed = await this.checkPotentialDuplicates({
      name: input.name,
      phone: input.phone,
      dob: dobDate,
      aadhaarNumber: aadhaar,
    });

    await logAdminAction({
      action: duplicatesBypassed.length > 0 ? "PATIENT_REGISTERED_WITH_BYPASS" : "PATIENT_REGISTERED",
      resource: "Patient",
      entityId: result.id,
      newState: {
        uhid: result.uhid,
        name: result.name,
        phone: result.phone,
        duplicateBypassed: duplicatesBypassed.length > 0,
      },
      description: `Registered patient ${result.name} with UHID ${result.uhid}.`,
    });

    return { duplicateDetected: false, patient: result };
  }

  /**
   * updatePatient
   * Updates patient demographic profile details. Enforces version checks and edit duplicate warning blocks.
   */
  static async updatePatient(
    patientId: string,
    version: number,
    input: PatientFormOutput,
    employeeId: string
  ) {
    const existing = await prisma.patient.findUnique({
      where: { id: patientId, isDeleted: false },
      include: { address: true, emergencyContact: true, referrals: true },
    });

    if (!existing) {
      throw new AppError("Patient profile record not found.", 404, "NOT_FOUND");
    }

    // Verify optimistic locking version checks
    if (existing.version !== version) {
      throw new AppError(
        "Conflict: The patient record has been updated by another user. Please reload.",
        409,
        "CONFLICT"
      );
    }

    const dobDate = new Date(input.dob);
    const aadhaar = input.aadhaarNumber && input.aadhaarNumber.trim() !== "" ? input.aadhaarNumber : null;

    // Check if sensitive search parameters changed to verify duplicates
    const phoneChanged = existing.phone !== input.phone;
    const aadhaarChanged = existing.aadhaarNumber !== aadhaar;
    const nameChanged = existing.name.toLowerCase().trim() !== input.name.toLowerCase().trim();
    const dobChanged = existing.dob.getTime() !== dobDate.getTime();

    if ((phoneChanged || aadhaarChanged || nameChanged || dobChanged) && !input.confirmDuplicate) {
      const duplicates = await this.checkPotentialDuplicates(
        {
          name: input.name,
          phone: input.phone,
          dob: dobDate,
          aadhaarNumber: aadhaar,
        },
        patientId
      );

      if (duplicates.length > 0) {
        return { duplicateDetected: true, duplicates };
      }
    }

    // Execute Updates inside a transaction
    const updated = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.update({
        where: { id: patientId },
        data: {
          name: input.name,
          phone: input.phone,
          alternatePhone: input.alternatePhone || null,
          email: input.email || null,
          dob: dobDate,
          gender: input.gender,
          bloodGroup: input.bloodGroup || null,
          aadhaarNumber: aadhaar,
          occupation: input.occupation || null,
          photoUrl: input.photoUrl || null,
          maritalStatus: input.maritalStatus || null,
          nationality: input.nationality,
          remarks: input.remarks || null,
          version: { increment: 1 },
          updatedBy: employeeId,
        },
      });

      // Update address
      await tx.patientAddress.update({
        where: { patientId },
        data: {
          addressLine: input.addressLine?.trim() || "Not Provided",
          city: input.city?.trim() || "N/A",
          state: input.state?.trim() || "N/A",
          pincode: input.pincode?.trim() || "000000",
          updatedBy: employeeId,
        },
      });

      // Update emergency contact
      await tx.patientEmergencyContact.update({
        where: { patientId },
        data: {
          name: input.emergencyContactName?.trim() || "N/A",
          phone: input.emergencyContactPhone?.trim() || "0000000000",
          relation: input.emergencyContactRelation?.trim() || "N/A",
          updatedBy: employeeId,
        },
      });

      // Update referral
      const ref = existing.referrals[0];
      if (ref) {
        await tx.patientReferral.update({
          where: { id: ref.id },
          data: {
            referralType: input.referralType || "SELF",
            referralName: input.referralName || "Self",
            referralNotes: input.referralNotes || null,
            updatedBy: employeeId,
          },
        });
      } else {
        await tx.patientReferral.create({
          data: {
            patientId,
            referralType: input.referralType || "SELF",
            referralName: input.referralName || "Self",
            referralNotes: input.referralNotes || null,
            createdBy: employeeId,
          },
        });
      }

      return patient;
    }, { timeout: 30000 });

    // Detect actual diff changes
    const previousState: Record<string, unknown> = {};
    const newState: Record<string, unknown> = {};
    let dataChanged = false;

    // Filter fields to find differences
    const checkFields: (keyof typeof input)[] = ["name", "phone", "alternatePhone", "email", "gender", "occupation", "remarks"];
    checkFields.forEach((field) => {
      const oldVal = existing[field as keyof typeof existing];
      const newVal = input[field];
      if (oldVal !== newVal) {
        previousState[field] = oldVal;
        newState[field] = newVal;
        dataChanged = true;
      }
    });

    // Check Dob
    if (dobChanged) {
      previousState.dob = existing.dob;
      newState.dob = dobDate;
      dataChanged = true;
    }

    // Only audit and log if actual values changed
    if (dataChanged) {
      await logAdminAction({
        action: "PATIENT_UPDATED",
        resource: "Patient",
        entityId: patientId,
        previousState,
        newState,
        description: `Updated demographic parameters for patient ${updated.name} (UHID ${updated.uhid}).`,
      });
    }

    return { duplicateDetected: false, patient: updated };
  }
}
export default PatientService;
