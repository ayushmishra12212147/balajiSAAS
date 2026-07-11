import { z } from "zod";

/**
 * LabResultEntrySchema
 * Validates laboratory result entries and blocks technician self-verification.
 */
export const LabResultEntrySchema = z
  .object({
    orderId: z.string().uuid("Invalid order identifier"),
    remarks: z.string().max(1000, "Remarks must be under 1000 characters").optional().nullable(),
    technicianId: z.string().uuid("Invalid technician identifier"),
    verifiedById: z.string().uuid("Invalid verifier identifier"),
    parameters: z
      .array(
        z.object({
          name: z.string().min(1, "Parameter name is required").max(100),
          value: z.string().min(1, "Value is required").max(100),
          referenceRange: z.string().max(100).optional().nullable(),
          unit: z.string().max(20).optional().nullable(),
        })
      )
      .min(1, "At least one result parameter must be entered"),
  })
  .refine(
    (data) => data.technicianId !== data.verifiedById,
    {
      message: "The verifying authority must be a different employee than the recording technician.",
      path: ["verifiedById"],
    }
  );

/**
 * RadiologyReportSchema
 * Validates radiology findings entry and blocks self-verification.
 */
export const RadiologyReportSchema = z
  .object({
    orderId: z.string().uuid("Invalid order identifier"),
    findings: z.string().min(10, "Findings report must be at least 10 characters").max(10000),
    remarks: z.string().max(1000, "Remarks must be under 1000 characters").optional().nullable(),
    technicianId: z.string().uuid("Invalid technician identifier"),
    verifiedById: z.string().uuid("Invalid verifier identifier"),
  })
  .refine(
    (data) => data.technicianId !== data.verifiedById,
    {
      message: "The verifying authority must be a different employee than the recording technician.",
      path: ["verifiedById"],
    }
  );

/**
 * OrderCancellationSchema
 * Validates cancellation description requirements.
 */
export const OrderCancellationSchema = z.object({
  reason: z
    .string()
    .min(5, "Cancellation reason must be at least 5 characters")
    .max(500, "Cancellation reason must be under 500 characters")
    .trim(),
});

export type LabResultEntryInput = z.infer<typeof LabResultEntrySchema>;
export type LabResultEntryFormInput = z.input<typeof LabResultEntrySchema>;

export type RadiologyReportInput = z.infer<typeof RadiologyReportSchema>;
export type RadiologyReportFormInput = z.input<typeof RadiologyReportSchema>;

export type OrderCancellationInput = z.infer<typeof OrderCancellationSchema>;
