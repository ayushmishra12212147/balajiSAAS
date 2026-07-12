import { z } from "zod";

/**
 * HospitalSettingsSchema
 * Validates hospital identity profile inputs.
 */
export const HospitalSettingsSchema = z.object({
  name: z.string().min(3, "Hospital Name must be at least 3 characters").max(150),
  code: z.string().min(2, "Hospital Code must be at least 2 characters").max(10).toUpperCase(),
  phone: z.string().min(5, "Phone number is too short").max(20),
  email: z.string().email("Invalid email address"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  gstNumber: z.string().max(50).nullable().optional(),
  registrationNumber: z.string().max(100).nullable().optional(),
  website: z.string().url("Invalid website URL").or(z.literal("")).nullable().optional(),
  logoUrl: z.string().url("Invalid logo URL").or(z.literal("")).nullable().optional(),
  footerText: z.string().max(1000).nullable().optional(),
});

/**
 * EmployeeFormSchema
 * Validates employee configuration records.
 */
export const EmployeeFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  employeeCode: z.string().max(50).optional().or(z.literal("")),
  email: z.string().email("Invalid email address"),
  passwordRaw: z.string().min(8, "Password must be at least 8 characters").optional(), // Optional during updates
  role: z.enum(["SUPER_ADMIN", "HOSPITAL_ADMIN", "EMPLOYEE"]),
  designation: z.string().min(2, "Designation must be at least 2 characters").max(100),
  departmentId: z
    .string()
    .uuid("Invalid department")
    .or(z.literal(""))
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),
  mobileNumber: z.string().min(5, "Mobile number is too short").max(20),
  joiningDate: z.string().or(z.date()).transform((val) => new Date(val)),
  isActive: z.boolean(),
});

/**
 * DoctorFormSchema
 * Validates doctor configurations, including embedded employee details on initial creation.
 */
export const DoctorFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  // Doctor properties
  registrationNumber: z.string().max(50).optional().or(z.literal("")),
  qualification: z.string().min(2, "Qualification is too short").max(150),
  specialization: z.string().min(2, "Specialization is too short").max(100),
  consultationFee: z.number().min(0, "Consultation rate must be greater than or equal to 0"),
  roomNumber: z.string().max(20).nullable().optional(),
  dutySchedule: z.any().optional(),
  // Employee properties
  employeeCode: z.string().max(50).optional().or(z.literal("")),
  email: z.string().email("Invalid email address"),
  passwordRaw: z.string().min(8, "Password must be at least 8 characters"),
  mobileNumber: z.string().min(5, "Mobile number is too short").max(20),
  joiningDate: z.string().or(z.date()).transform((val) => new Date(val)),
  departmentId: z
    .string()
    .uuid("Invalid department")
    .or(z.literal(""))
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),
});

/**
 * DepartmentFormSchema
 * Validates clinical department name and unique codes.
 */
export const DepartmentFormSchema = z.object({
  name: z.string().min(3, "Department Name must be at least 3 characters").max(100),
  code: z
    .string()
    .min(2, "Department Code must be at least 2 characters")
    .max(10)
    .toUpperCase()
    .regex(/^[A-Z0-9]+$/, "Code must be alphanumeric and uppercase"),
  description: z.string().max(500).nullable().optional(),
  isDeleted: z.boolean(), // maps to disabled state
});

export const SystemSettingsFormSchema = z.object({
  invoice_prefix: z.string().min(1).max(10),
  opd_prefix: z.string().min(1).max(10),
  ipd_prefix: z.string().min(1).max(10),
  ot_prefix: z.string().min(1).max(10),
  laboratory_prefix: z.string().min(1).max(10),
  number_padding: z.number().min(1).max(10),
  session_timeout: z.number().min(1).max(720),
  lockout_duration: z.number().min(1).max(1440),
  global_currency: z.string().min(1).max(10),
  global_timezone: z.string().min(1),
  global_date_format: z.string().min(1),
  global_time_format: z.enum(["12h", "24h"]),
  global_decimal_precision: z.number().min(0).max(4),
  global_paper_size: z.enum(["A4", "A5"]),
  global_default_printer: z.string().min(1),
  global_print_margins: z.string().min(1),
  document_configs: z.any().optional(),
});
export type SystemSettingsFormInput = z.infer<typeof SystemSettingsFormSchema>;

export const ChargeCatalogFormSchema = z.object({
  name: z.string().min(3, "Item name must be at least 3 characters").max(150),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(20)
    .toUpperCase()
    .regex(/^[A-Z0-9_]+$/, "Code must be alphanumeric, uppercase, and can contain underscores"),
  category: z.string().min(2, "Category must be at least 2 characters").max(50),
  rate: z.number().min(0, "Rate must be greater than or equal to 0"),
  otType: z
    .union([z.enum(["MINOR", "MAJOR"]), z.literal(""), z.null()])
    .transform((val) => (val === "" ? null : val))
    .optional(),
  isDeleted: z
    .union([z.boolean(), z.string()])
    .transform((val) => {
      if (typeof val === "boolean") return val;
      return val === "true";
    })
    .optional(),
});
export type ChargeCatalogFormInput = z.infer<typeof ChargeCatalogFormSchema>;
export type ChargeCatalogFormRawInput = z.input<typeof ChargeCatalogFormSchema>;

