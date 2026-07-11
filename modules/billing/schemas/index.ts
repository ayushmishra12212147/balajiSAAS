import { z } from "zod";

/**
 * InvoiceGenerationSchema
 * Validates requirements for creating a new invoice from pending charges.
 */
export const InvoiceGenerationSchema = z
  .object({
    patientId: z.string().uuid("Invalid patient identifier"),
    chargeIds: z.array(z.string().uuid()).min(1, "At least one charge must be selected to invoice"),
    discountAmount: z.preprocess(
      (val) => {
        if (val === "" || val === null || val === undefined || Number.isNaN(Number(val))) return 0;
        return Number(val);
      },
      z.number().min(0, "Discount amount cannot be negative")
    ).default(0),
    discountPercentage: z.preprocess(
      (val) => {
        if (val === "" || val === null || val === undefined || Number.isNaN(Number(val))) return 0;
        return Number(val);
      },
      z.number().min(0).max(100, "Discount percentage must be between 0 and 100")
    ).default(0),
    discountReason: z.string().max(500, "Discount reason must be under 500 characters").optional().nullable(),
  })
  .refine(
    (data) => {
      const hasDiscount = (data.discountAmount && data.discountAmount > 0) || (data.discountPercentage && data.discountPercentage > 0);
      if (hasDiscount) {
        return !!data.discountReason && data.discountReason.trim().length > 0;
      }
      return true;
    },
    {
      message: "A discount reason description is mandatory when applying discounts.",
      path: ["discountReason"],
    }
  );

/**
 * ReceivePaymentSchema
 * Validates checkout parameters, ensuring payments breakdown sum equals total amount submitted.
 */
export const ReceivePaymentSchema = z
  .object({
    invoiceId: z.string().uuid("Invalid invoice identifier"),
    version: z.number().int().min(1, "Invalid invoice version number"),
    totalAmount: z.number().min(0.01, "Submitted payment amount must be positive"),
    payments: z
      .array(
        z.object({
          amount: z.number().min(0.01, "Individual payment amount must be positive"),
          mode: z.enum(["CASH", "UPI", "CARD", "CHEQUE", "BANK_TRANSFER"]),
          reference: z.string().max(100, "Reference code must be under 100 characters").optional().nullable(),
        })
      )
      .min(1, "At least one payment breakdown must be specified"),
  })
  .refine(
    (data) => {
      const breakdownSum = data.payments.reduce((acc, curr) => acc + curr.amount, 0);
      // Allow minor float precision tolerance (within 0.01 margin)
      return Math.abs(breakdownSum - data.totalAmount) < 0.01;
    },
    {
      message: "The sum of all payment mode breakdowns must equal the total payment amount submitted.",
      path: ["payments"],
    }
  );

/**
 * RefundSchema
 * Validates refund details.
 */
export const RefundSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice identifier"),
  amount: z.number().min(0.01, "Refund amount must be positive"),
  reason: z
    .string()
    .min(5, "Refund reason description must be at least 5 characters")
    .max(500, "Refund reason description must be under 500 characters")
    .trim(),
});

/**
 * CancelInvoiceSchema
 * Validates cancellation details.
 */
export const CancelInvoiceSchema = z.object({
  reason: z
    .string()
    .min(5, "Cancellation reason description must be at least 5 characters")
    .max(500, "Cancellation reason description must be under 500 characters")
    .trim(),
});

export type InvoiceGenerationInput = z.infer<typeof InvoiceGenerationSchema>;
export type InvoiceGenerationFormInput = z.input<typeof InvoiceGenerationSchema>;

export type ReceivePaymentInput = z.infer<typeof ReceivePaymentSchema>;
export type ReceivePaymentFormInput = z.input<typeof ReceivePaymentSchema>;

export type RefundInput = z.infer<typeof RefundSchema>;
export type CancelInvoiceInput = z.infer<typeof CancelInvoiceSchema>;
