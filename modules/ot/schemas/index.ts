import { z } from "zod";
import { OTType } from "@prisma/client";

export const OTRegistrationSchema = z
  .object({
    patientId: z.string().uuid("Invalid patient identifier"),
    ipdAdmissionId: z.string().uuid("Invalid IPD admission identifier").optional().nullable(),
    opdConsultationId: z.string().uuid("Invalid OPD consultation identifier").optional().nullable(),
    operationType: z.nativeEnum(OTType, { message: "Select a valid OT type (MINOR or MAJOR)" }),
    primarySurgeonId: z.string().uuid("Invalid primary surgeon identifier"),
    assistantSurgeonId: z.string().uuid("Invalid assistant surgeon identifier").optional().nullable(),
    departmentId: z.string().uuid("Invalid department identifier"),
    procedureCatalogId: z.string().uuid("Invalid catalog procedure identifier").optional().nullable(),
    operationName: z.string().min(3, "Operation name must be at least 3 characters").max(150),
    diagnosis: z.string().min(3, "Diagnosis must be at least 3 characters").max(1000),
    scheduledDate: z.string().min(1, "Scheduled date and time is required"),
    remarks: z.string().max(2000, "Remarks must be under 2000 characters").optional().nullable(),
  })
  .refine(
    (data) => {
      const hasIpd = !!data.ipdAdmissionId;
      const hasOpd = !!data.opdConsultationId;
      return (hasIpd && !hasOpd) || (!hasIpd && hasOpd);
    },
    {
      message: "An OT must belong to either an OPD Consultation OR an IPD Admission. Never both, and never neither.",
      path: ["ipdAdmissionId"],
    }
  );

export const OTChargeAssignmentSchema = z.object({
  chargeCatalogId: z.string().uuid("Invalid catalog charge identifier").optional().nullable(),
  customName: z.string().min(2, "Custom name must be at least 2 characters").optional().nullable(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").default(1),
  rate: z.number().min(0, "Rate must be greater than or equal to 0").optional().nullable(),
});

export const OTRevisionSchema = z.object({
  operationName: z.string().min(3, "Operation name must be at least 3 characters").max(150),
  diagnosis: z.string().min(3, "Diagnosis must be at least 3 characters").max(1000),
  primarySurgeonId: z.string().uuid("Invalid primary surgeon identifier"),
  assistantSurgeonId: z.string().uuid("Invalid assistant surgeon identifier").optional().nullable(),
  departmentId: z.string().uuid("Invalid department identifier"),
  remarks: z.string().max(2000, "Remarks must be under 2000 characters").optional().nullable(),
});

export type OTRegistrationInput = z.infer<typeof OTRegistrationSchema>;
export type OTChargeAssignmentInput = z.infer<typeof OTChargeAssignmentSchema>;
export type OTRevisionInput = z.infer<typeof OTRevisionSchema>;
