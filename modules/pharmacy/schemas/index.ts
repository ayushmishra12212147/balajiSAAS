import { z } from "zod";
import { PaymentMode, PharmacyAdjustmentType } from "@prisma/client";

export const MedicineMasterSchema = z.object({
  name: z.string().min(3, "Medicine name must be at least 3 characters").max(150),
  genericName: z.string().min(3, "Generic name must be at least 3 characters").max(150),
  brand: z.string().min(1, "Brand is required").max(100),
  category: z.string().min(1, "Category is required").max(50),
  form: z.string().min(1, "Form is required").max(50),
  unit: z.string().min(1, "Unit is required").max(30),
  hsnCode: z.string().max(30).optional().nullable(),
  gstPercentage: z.number().min(0, "GST % cannot be negative").default(0),
  purchasePrice: z.number().min(0, "Purchase price cannot be negative").default(0),
  sellingPrice: z.number().min(0, "Selling price cannot be negative").default(0),
  minimumStock: z.number().int().min(0, "Minimum stock cannot be negative").default(0),
  isActive: z.boolean().default(true),
  isExpirable: z.boolean().default(true),
  expiryDate: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  initialQuantity: z.number().int().optional().default(0),
});

export const PurchaseItemSchema = z.object({
  medicineId: z.string().uuid("Invalid medicine identifier"),
  batchNumber: z.string().min(1, "Batch number is required").max(50),
  expiryDate: z.string().optional().nullable(),
  quantityReceived: z.number().int().min(1, "Quantity received must be at least 1"),
  purchaseRate: z.number().min(0, "Purchase rate cannot be negative"),
  sellingRate: z.number().min(0, "Selling rate cannot be negative"),
  gstPercentage: z.number().min(0, "GST % cannot be negative").default(0),
});

export const PurchaseEntrySchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required").max(50),
  supplierName: z.string().min(1, "Supplier name is required").max(150),
  orderDate: z.string().min(1, "Purchase date is required"),
  remarks: z.string().max(2000).optional().nullable(),
  items: z.array(PurchaseItemSchema).min(1, "At least one purchase item is required"),
});

export const StockAdjustmentSchema = z.object({
  medicineId: z.string().uuid("Invalid medicine identifier"),
  batchNumber: z.string().min(1, "Batch number is required").max(50),
  adjustmentType: z.nativeEnum(PharmacyAdjustmentType, { message: "Select a valid adjustment type" }),
  quantity: z.number().int("Quantity must be an integer"),
  reason: z.string().min(5, "Reason must be at least 5 characters").max(1000),
});

export const SaleItemSchema = z.object({
  medicineId: z.string().uuid("Invalid medicine identifier"),
  batchNumber: z.string().min(1, "Batch number is required").max(50),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  discountPercentage: z.number().min(0).max(100).default(0),
});

export const SalePaymentSchema = z.object({
  paymentMode: z.nativeEnum(PaymentMode, { message: "Select a valid payment mode" }),
  amount: z.number().min(0, "Payment amount cannot be negative"),
});

export const PharmacySalesSchema = z.object({
  customerName: z.string().min(1, "Customer name is required").max(150),
  customerPhone: z.string().max(20).optional().nullable(),
  items: z.array(SaleItemSchema).min(1, "At least one item must be added to the sale"),
  paymentModes: z.array(SalePaymentSchema).min(1, "At least one payment mode is required"),
});

export const ReturnItemSchema = z.object({
  medicineId: z.string().uuid("Invalid medicine identifier"),
  batchNumber: z.string().min(1, "Batch number is required").max(50),
  quantityReturned: z.number().int().min(1, "Quantity returned must be at least 1"),
});

export const SalesReturnSchema = z.object({
  pharmacyInvoiceId: z.string().uuid("Invalid invoice identifier"),
  reason: z.string().min(5, "Return reason must be at least 5 characters").max(1000),
  items: z.array(ReturnItemSchema).min(1, "At least one return item must be added"),
});

export type MedicineMasterInput = z.infer<typeof MedicineMasterSchema>;
export type MedicineMasterFormInput = z.input<typeof MedicineMasterSchema>;

export type PurchaseEntryInput = z.infer<typeof PurchaseEntrySchema>;
export type PurchaseEntryFormInput = z.input<typeof PurchaseEntrySchema>;

export type StockAdjustmentInput = z.infer<typeof StockAdjustmentSchema>;

export type PharmacySalesInput = z.infer<typeof PharmacySalesSchema>;
export type PharmacySalesFormInput = z.input<typeof PharmacySalesSchema>;

export type SalesReturnInput = z.infer<typeof SalesReturnSchema>;
export type SalesReturnFormInput = z.input<typeof SalesReturnSchema>;
