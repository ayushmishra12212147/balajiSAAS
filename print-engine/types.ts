export type PrintFormat = "A4" | "A5" | "THERMAL_80MM" | "THERMAL_58MM" | "LABEL_BARCODE" | "LABEL_QR";

export interface PrintJobOptions {
  format: PrintFormat;
  printerName?: string;
  copies?: number;
  silent?: boolean;
}

export interface PrintData {
  title: string;
  timestamp: string;
  hospitalName: string;
  content: Record<string, unknown>;
  footer?: string;
}

export interface PrintResult {
  success: boolean;
  jobId: string;
  outputFormat: PrintFormat;
  renderedPayload: string; // Base64 string, HTML string, or ZPL/ESC-POS byte sequence
  printedAt: string;
}
