import { z } from "zod";
import { Gender, DeliveryType, DeathLocationType } from "@prisma/client";

export const AdmissionFormSchema = z.object({
  patientId: z.string().uuid("Invalid patient identifier"),
  doctorId: z.string().uuid("Invalid doctor identifier"),
  departmentId: z.string().uuid("Invalid department identifier"),
  bedId: z.string().uuid("Invalid bed identifier"),
  admissionDate: z.string().optional().nullable(),
  referredByDoctorId: z.string().uuid("Invalid referring doctor").optional().nullable(),
  isMLC: z.boolean().optional().default(false),
  mlcNumber: z.string().optional().nullable(),
  admissionSource: z.enum(["DIRECT", "OPD_REFERRAL", "EMERGENCY", "DOCTOR_REFERRAL"]),
  admissionCategory: z.enum(["GENERAL", "PRIVATE", "INSURANCE", "CORPORATE", "GOVERNMENT_SCHEME"]).default("GENERAL"),
  initialDepositRequired: z.number().nonnegative("Deposit cannot be negative").optional().default(0),
  admissionReason: z.string().min(2, "Reason must be at least 2 characters"),
  attendantName: z.string().min(2, "Attendant name must be at least 2 characters"),
  attendantRelationship: z.string().min(2, "Attendant relationship must be at least 2 characters"),
  attendantMobile: z.string().min(10, "Mobile number must be at least 10 characters"),
});

export const BedTransferSchema = z.object({
  newBedId: z.string().uuid("Invalid destination bed identifier"),
  transferReason: z.string().max(500, "Reason must be under 500 characters").optional().nullable(),
});

export const DoctorReassignmentSchema = z.object({
  newDoctorId: z.string().uuid("Invalid doctor identifier"),
  reason: z.string().max(500, "Reason must be under 500 characters").optional().nullable(),
});

export const ChargeAssignmentSchema = z.object({
  chargeCatalogId: z.string().uuid("Invalid catalog charge identifier").optional().nullable(),
  customName: z.string().optional().nullable(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").default(1),
  rate: z.number().positive("Custom rate must be positive").optional().nullable(),
});

export const DischargeSchema = z.object({
  dischargeType: z.enum(["NORMAL", "LAMA", "DAMA", "REFERRED", "EXPIRED"]),
  finalDiagnosis: z.string().min(3, "Final diagnosis must be at least 3 characters"),
  dischargeSummary: z.string().min(5, "Discharge summary must be at least 5 characters"),
  treatmentSummary: z.string().optional().nullable(),
  conditionAtDischarge: z.string().optional().nullable(),
  followUpInstructions: z.string().optional().nullable(),
  dischargeDateTime: z.string().optional().nullable(),
});

export const BirthRegistrationSchema = z.object({
  babyName: z.string().max(150, "Name must be under 150 characters").optional().nullable(),
  gender: z.nativeEnum(Gender, { message: "Select a valid gender" }),
  weightKg: z.number().positive("Weight must be positive").min(0.1, "Baby weight must be at least 0.1 Kg"),
  deliveryType: z.nativeEnum(DeliveryType, { message: "Select a valid delivery type" }),
  dob: z.string().min(1, "Date and Time of birth is required"),
  attendingDoctorId: z.string().uuid("Invalid attending doctor identifier"),
});

export const DeathRegistrationSchema = z.object({
  deceasedName: z.string().max(150, "Deceased name must be under 150 characters").optional().nullable(),
  deceasedAge: z.number().int().min(0, "Deceased age must be a positive number").optional().nullable(),
  deceasedGender: z.nativeEnum(Gender).optional().nullable(),
  dateOfDeath: z.string().min(1, "Date and time of death is required"),
  causeOfDeath: z.string().min(5, "Cause of death must be at least 5 characters").max(1000),
  locationType: z.nativeEnum(DeathLocationType, { message: "Select a valid location type" }),
  attendingDoctorId: z.string().uuid("Invalid attending doctor identifier"),
  informantDetails: z.string().max(1000, "Informant details must be under 1000 characters").optional().nullable(),
});

export type AdmissionFormInput = z.infer<typeof AdmissionFormSchema>;
export type BedTransferInput = z.infer<typeof BedTransferSchema>;
export type DoctorReassignmentInput = z.infer<typeof DoctorReassignmentSchema>;
export type ChargeAssignmentInput = z.infer<typeof ChargeAssignmentSchema>;
export type DischargeInput = z.infer<typeof DischargeSchema>;
export type BirthRegistrationInput = z.infer<typeof BirthRegistrationSchema>;
export type DeathRegistrationInput = z.infer<typeof DeathRegistrationSchema>;
