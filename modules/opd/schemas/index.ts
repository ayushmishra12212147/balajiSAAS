import { z } from "zod";

/**
 * OPDRegistrationSchema
 * Enforces validation for new outpatient encounters.
 * Mandates overrideReason when consultation fees are customized.
 */
export const OPDRegistrationSchema = z
  .object({
    patientId: z.string().uuid("Invalid patient identifier"),
    doctorId: z.string().uuid("Invalid doctor identifier"),
    departmentId: z.string().uuid("Invalid department identifier"),
    originalFee: z.number().min(0, "Original fee cannot be negative"),
    appliedFee: z.number().min(0, "Applied fee cannot be negative"),
    overrideReason: z.string().max(500, "Override reason must be under 500 characters").optional().nullable(),
    depositAmount: z.number().min(0, "Deposit cannot be negative").default(0),
    symptoms: z.string().max(1000, "Symptoms description must be under 1000 characters").optional().nullable(),
    assignedLabTests: z.array(z.string().uuid()).default([]),
    assignedRadiologyTests: z.array(z.string().uuid()).default([]),
  })
  .refine(
    (data) => {
      if (data.originalFee !== data.appliedFee) {
        return !!data.overrideReason && data.overrideReason.trim().length > 0;
      }
      return true;
    },
    {
      message: "An override reason is required when the applied fee differs from the original fee.",
      path: ["overrideReason"],
    }
  );

/**
 * OPDCancellationSchema
 * Validates cancellation requirements.
 */
export const OPDCancellationSchema = z.object({
  reason: z
    .string()
    .min(5, "Cancellation reason must be at least 5 characters")
    .max(500, "Cancellation reason must be under 500 characters")
    .trim(),
});

export type OPDRegistrationInput = z.infer<typeof OPDRegistrationSchema>;
export type OPDRegistrationFormInput = z.input<typeof OPDRegistrationSchema>;
export type OPDCancellationInput = z.infer<typeof OPDCancellationSchema>;
