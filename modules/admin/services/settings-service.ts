import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "./audit-service";

export type SettingKeyType =
  | "invoice_prefix"
  | "opd_prefix"
  | "ipd_prefix"
  | "ot_prefix"
  | "laboratory_prefix"
  | "number_padding"
  | "session_timeout"
  | "lockout_duration"
  | "global_currency"
  | "global_timezone"
  | "global_date_format"
  | "global_time_format"
  | "global_decimal_precision"
  | "global_paper_size"
  | "global_default_printer"
  | "global_print_margins"
  | "document_configs"
  | "license_key"
  | "license_data"
  | "maintenance_mode"
  | "maintenance_message"
  | "maintenance_block_on_expiry";

interface SettingDefinition {
  key: SettingKeyType;
  dataType: "STRING" | "INTEGER" | "BOOLEAN" | "JSON";
  category: "GENERAL" | "AUTH" | "BILLING" | "OPD" | "IPD" | "OT" | "LABORATORY" | "PRINTING";
  description: string;
  validate: (val: string) => boolean;
}

export const SETTING_DEFINITIONS: Record<SettingKeyType, SettingDefinition> = {
  invoice_prefix: {
    key: "invoice_prefix",
    dataType: "STRING",
    category: "BILLING",
    description: "Prefix code prepended to generated billing invoice numbers",
    validate: (val) => val.trim().length > 0 && val.trim().length <= 10,
  },
  opd_prefix: {
    key: "opd_prefix",
    dataType: "STRING",
    category: "OPD",
    description: "Prefix code prepended to outpatient consultations registration numbers",
    validate: (val) => val.trim().length > 0 && val.trim().length <= 10,
  },
  ipd_prefix: {
    key: "ipd_prefix",
    dataType: "STRING",
    category: "IPD",
    description: "Prefix code prepended to inpatient admission IDs",
    validate: (val) => val.trim().length > 0 && val.trim().length <= 10,
  },
  ot_prefix: {
    key: "ot_prefix",
    dataType: "STRING",
    category: "OT",
    description: "Prefix code prepended to surgery bookings",
    validate: (val) => val.trim().length > 0 && val.trim().length <= 10,
  },
  laboratory_prefix: {
    key: "laboratory_prefix",
    dataType: "STRING",
    category: "LABORATORY",
    description: "Prefix code prepended to diagnostic test orders",
    validate: (val) => val.trim().length > 0 && val.trim().length <= 10,
  },
  number_padding: {
    key: "number_padding",
    dataType: "INTEGER",
    category: "GENERAL",
    description: "Formatting padding length for sequence numbers (e.g., 5 prints 00001)",
    validate: (val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 1 && num <= 10;
    },
  },
  session_timeout: {
    key: "session_timeout",
    dataType: "INTEGER",
    category: "AUTH",
    description: "Inactivity session duration limit in hours before auto logout",
    validate: (val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 1 && num <= 720;
    },
  },
  lockout_duration: {
    key: "lockout_duration",
    dataType: "INTEGER",
    category: "AUTH",
    description: "Lockout duration in minutes for brute-force deactivations",
    validate: (val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 1 && num <= 1440;
    },
  },
  global_currency: {
    key: "global_currency",
    dataType: "STRING",
    category: "GENERAL",
    description: "Active system currency denominator symbol (e.g., INR, USD)",
    validate: (val) => val.trim().length > 0 && val.trim().length <= 10,
  },
  global_timezone: {
    key: "global_timezone",
    dataType: "STRING",
    category: "GENERAL",
    description: "System standard timezone setting",
    validate: (val) => val.trim().length > 0,
  },
  global_date_format: {
    key: "global_date_format",
    dataType: "STRING",
    category: "GENERAL",
    description: "Formatting structure for printed dates (e.g., DD/MM/YYYY)",
    validate: (val) => val.trim().length > 0,
  },
  global_time_format: {
    key: "global_time_format",
    dataType: "STRING",
    category: "GENERAL",
    description: "Formatting hours display on printed documents (12h or 24h)",
    validate: (val) => ["12h", "24h"].includes(val.trim()),
  },
  global_decimal_precision: {
    key: "global_decimal_precision",
    dataType: "INTEGER",
    category: "GENERAL",
    description: "Decimal places printed for amounts",
    validate: (val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 0 && num <= 4;
    },
  },
  global_paper_size: {
    key: "global_paper_size",
    dataType: "STRING",
    category: "GENERAL",
    description: "Standard layout printing dimensions (A4 or A5)",
    validate: (val) => ["A4", "A5"].includes(val.trim()),
  },
  global_default_printer: {
    key: "global_default_printer",
    dataType: "STRING",
    category: "GENERAL",
    description: "Name of target printing device configuration",
    validate: (val) => val.trim().length > 0,
  },
  global_print_margins: {
    key: "global_print_margins",
    dataType: "STRING",
    category: "GENERAL",
    description: "Spacing padding margins applied on page canvas (e.g., 15mm)",
    validate: (val) => val.trim().length > 0,
  },
  document_configs: {
    key: "document_configs",
    dataType: "JSON",
    category: "PRINTING",
    description: "Document header/footer height constraints, watermark texts, and signature lines",
    validate: (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
  },
  license_key: {
    key: "license_key",
    dataType: "STRING",
    category: "GENERAL",
    description: "Activation registration key string",
    validate: (val) => val.trim().length >= 0,
  },
  license_data: {
    key: "license_data",
    dataType: "JSON",
    category: "GENERAL",
    description: "Active license properties (expiry date, registered owner details)",
    validate: (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
  },
  maintenance_mode: {
    key: "maintenance_mode",
    dataType: "BOOLEAN",
    category: "GENERAL",
    description: "Toggle to block non-super admin users from access",
    validate: (val) => ["true", "false"].includes(val.trim().toLowerCase()),
  },
  maintenance_message: {
    key: "maintenance_message",
    dataType: "STRING",
    category: "GENERAL",
    description: "Display message shown during maintenance lock periods",
    validate: (val) => val.trim().length > 0,
  },
  maintenance_block_on_expiry: {
    key: "maintenance_block_on_expiry",
    dataType: "BOOLEAN",
    category: "GENERAL",
    description: "Whether to restrict business transactions if the license expires",
    validate: (val) => ["true", "false"].includes(val.trim().toLowerCase()),
  },
};

/**
 * SettingsService
 * Directs configuration registry reads and validation rules validations.
 */
export class SettingsService {
  /**
   * Reads settings value safely, casting it to correct TS types.
   */
  static async getSetting(key: SettingKeyType) {
    const def = SETTING_DEFINITIONS[key];
    if (!def) {
      throw new AppError("Invalid setting key requested", 400, "BAD_REQUEST");
    }

    const row = await prisma.systemSetting.findUnique({
      where: { settingKey: key },
    });

    const rawVal = row ? row.settingValue : null;

    if (rawVal === null) {
      // Default fallbacks if not yet initialized in database
      if (def.dataType === "INTEGER") {
        if (key === "number_padding") return 5;
        if (key === "session_timeout") return 12;
        if (key === "lockout_duration") return 15;
        if (key === "global_decimal_precision") return 2;
      }
      if (key === "invoice_prefix") return "INV";
      if (key === "opd_prefix") return "OPD";
      if (key === "ipd_prefix") return "IPD";
      if (key === "ot_prefix") return "OT";
      if (key === "laboratory_prefix") return "LAB";
      if (key === "global_currency") return "₹";
      if (key === "global_timezone") return "Asia/Kolkata";
      if (key === "global_date_format") return "DD/MM/YYYY";
      if (key === "global_time_format") return "12h";
      if (key === "global_paper_size") return "A4";
      if (key === "global_default_printer") return "System Default";
      if (key === "global_print_margins") return "15mm";
      if (key === "document_configs") {
        return {
          opd_slip: { headerHeight: 40, footerHeight: 30, watermark: "", showLogo: true, showQR: true, showBarcode: false, signatureBlocks: ["Receptionist"] },
          opd_prescription: { headerHeight: 50, footerHeight: 30, watermark: "", showLogo: true, showQR: false, showBarcode: false, signatureBlocks: ["Doctor"] },
          invoice: { headerHeight: 50, footerHeight: 40, watermark: "", showLogo: true, showQR: true, showBarcode: true, signatureBlocks: ["Biller"] },
          receipt: { headerHeight: 40, footerHeight: 30, watermark: "", showLogo: true, showQR: true, showBarcode: false, signatureBlocks: ["Cashier"] },
          no_due: { headerHeight: 40, footerHeight: 30, watermark: "NO DUE", showLogo: true, showQR: false, showBarcode: false, signatureBlocks: ["Accountant"] },
          admission_slip: { headerHeight: 40, footerHeight: 30, watermark: "", showLogo: true, showQR: true, showBarcode: false, signatureBlocks: ["Admission Clerk"] },
          discharge_summary: { headerHeight: 50, footerHeight: 40, watermark: "", showLogo: true, showQR: false, showBarcode: false, signatureBlocks: ["Doctor"] },
          birth_certificate: { headerHeight: 60, footerHeight: 50, watermark: "BIRTH RECORD", showLogo: true, showQR: true, showBarcode: false, signatureBlocks: ["Registrar"] },
          death_certificate: { headerHeight: 60, footerHeight: 50, watermark: "DEATH RECORD", showLogo: true, showQR: true, showBarcode: false, signatureBlocks: ["Medical Officer"] },
          laboratory_report: { headerHeight: 50, footerHeight: 40, watermark: "", showLogo: true, showQR: false, showBarcode: true, signatureBlocks: ["Pathologist"] },
          radiology_report: { headerHeight: 50, footerHeight: 40, watermark: "", showLogo: true, showQR: false, showBarcode: true, signatureBlocks: ["Radiologist"] },
          ot_slip: { headerHeight: 40, footerHeight: 30, watermark: "", showLogo: true, showQR: false, showBarcode: false, signatureBlocks: ["OT Nurse"] },
          ot_summary: { headerHeight: 50, footerHeight: 40, watermark: "", showLogo: true, showQR: false, showBarcode: false, signatureBlocks: ["Surgeon"] },
          pharmacy_invoice: { headerHeight: 40, footerHeight: 30, watermark: "", showLogo: true, showQR: true, showBarcode: true, signatureBlocks: ["Pharmacist"] },
          pharmacy_return: { headerHeight: 40, footerHeight: 30, watermark: "RETURN", showLogo: true, showQR: false, showBarcode: false, signatureBlocks: ["Pharmacist"] }
        };
      }
      if (key === "maintenance_mode") return false;
      if (key === "maintenance_block_on_expiry") return true;
      if (key === "license_key") return "";
      if (key === "license_data") return null;
      if (key === "maintenance_message") return "System is undergoing scheduled maintenance. Please try again later.";
      return "";
    }

    if (def.dataType === "INTEGER") return parseInt(rawVal, 10);
    if (def.dataType === "BOOLEAN") return rawVal === "true";
    if (def.dataType === "JSON") return JSON.parse(rawVal);
    return rawVal;
  }

  /**
   * Sets and validates a system settings configuration key.
   * Records audit logs automatically on state mutations.
   */
  static async setSetting(key: SettingKeyType, value: string): Promise<void> {
    const def = SETTING_DEFINITIONS[key];
    if (!def) {
      throw new AppError("Invalid setting key requested", 400, "BAD_REQUEST");
    }

    if (!def.validate(value)) {
      throw new AppError(
        `Invalid data configuration value format for system setting key '${key}'`,
        400,
        "BAD_REQUEST"
      );
    }

    await prisma.$transaction(async (tx) => {
      const before = await tx.systemSetting.findUnique({
        where: { settingKey: key },
      });

      const updated = await tx.systemSetting.upsert({
        where: { settingKey: key },
        create: {
          settingKey: key,
          settingValue: value,
          dataType: def.dataType,
          category: def.category,
          description: def.description,
        },
        update: {
          settingValue: value,
          dataType: def.dataType,
          category: def.category,
          description: def.description,
        },
      });

      await logAdminAction({
        action: "SETTING_UPDATE",
        resource: "SystemSetting",
        entityId: updated.id,
        previousState: before ? { settingValue: before.settingValue } : null,
        newState: { settingValue: updated.settingValue },
        description: `Updated system preference config '${key}' to '${value}'`,
      });
    });
  }
}
