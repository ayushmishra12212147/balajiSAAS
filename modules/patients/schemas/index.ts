import { z } from "zod";
import { Gender, BloodGroup, MaritalStatus } from "@prisma/client";

/**
 * PatientFormSchema
 * Enforces validation for new registrations and demographic updates.
 */
export const PatientFormSchema = z.object({
  name: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(150, "Full name must be under 150 characters")
    .trim(),
  phone: z
    .string()
    .min(5, "Mobile number is too short")
    .max(20, "Mobile number is too long")
    .regex(/^\+?[0-9\s\-]+$/, "Invalid mobile number format"),
  alternatePhone: z
    .string()
    .max(20, "Alternate contact must be under 20 characters")
    .regex(/^\+?[0-9\s\-]+$/, "Invalid alternate contact format")
    .or(z.literal(""))
    .nullable()
    .optional(),
  email: z
    .string()
    .email("Invalid email format")
    .max(100)
    .or(z.literal(""))
    .nullable()
    .optional(),
  dob: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((d) => d <= new Date(), {
      message: "Date of Birth cannot be in the future",
    }),
  gender: z.nativeEnum(Gender, {
    message: "Gender is required",
  }),
  bloodGroup: z.preprocess((val) => (val === "" ? null : val), z.nativeEnum(BloodGroup).nullable().optional()),
  aadhaarNumber: z
    .string()
    .length(12, "Aadhaar number must be exactly 12 digits")
    .regex(/^[0-9]+$/, "Aadhaar must contain only numbers")
    .or(z.literal(""))
    .nullable()
    .optional(),
  occupation: z.string().max(100).nullable().optional(),
  maritalStatus: z.nativeEnum(MaritalStatus).nullable().optional(),
  nationality: z.string().max(100).default("Indian"),
  remarks: z.string().max(1000).nullable().optional(),
  photoUrl: z.string().max(2000).or(z.literal("")).nullable().optional(),

  // Address (Optional during quick registration)
  addressLine: z.string().max(500).trim().optional().or(z.literal("")).nullable(),
  city: z.string().min(1, "City is required").max(100).trim(),
  state: z.string().max(100).trim().optional().or(z.literal("")).nullable(),
  pincode: z
    .string()
    .max(15)
    .regex(/^[0-9]*$/, "Pincode must contain only numbers")
    .optional()
    .or(z.literal(""))
    .nullable(),

  // Emergency Contact (Optional during quick registration)
  emergencyContactName: z
    .string()
    .max(150)
    .trim()
    .optional()
    .or(z.literal(""))
    .nullable(),
  emergencyContactPhone: z
    .string()
    .max(20)
    .regex(/^\+?[0-9\s\-]*$/, "Invalid emergency contact phone format")
    .optional()
    .or(z.literal(""))
    .nullable(),
  emergencyContactRelation: z
    .string()
    .max(50)
    .trim()
    .optional()
    .or(z.literal(""))
    .nullable(),

  // Referral Information (Optional during quick registration)
  referralType: z.string().max(50).default("SELF").optional(), // "DOCTOR", "CLINIC", "HOSPITAL", "SELF"
  referralName: z.string().max(150).default("Self").optional(),
  referralNotes: z.string().max(1000).nullable().optional(),

  // Flags
  confirmDuplicate: z.boolean().default(false).optional(),
});

export type PatientFormInput = z.input<typeof PatientFormSchema>;
export type PatientFormOutput = z.infer<typeof PatientFormSchema>;
