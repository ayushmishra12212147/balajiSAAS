import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import {
  MedicineMasterInput,
  PurchaseEntryInput,
  StockAdjustmentInput,
  PharmacySalesInput,
  SalesReturnInput,
} from "../schemas";
import { PaymentMode, PharmacyAdjustmentType, InvoiceStatus, Prisma } from "@prisma/client";

export class PharmacyService {
  /**
   * createMedicine
   * Creates a new medicine entry with continuous coding.
   */
  static async createMedicine(data: MedicineMasterInput, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      // Generate code continuously
      const sequence = await tx.sequence.upsert({
        where: { sequenceName: "MEDICINE" },
        update: { currentValue: { increment: 1 } },
        create: {
          sequenceName: "MEDICINE",
          currentValue: 100001,
          prefix: "MED",
          paddingLength: 6,
        },
      });

      const runningNo = Number(sequence.currentValue);
      const code = `${sequence.prefix}${runningNo.toString().padStart(sequence.paddingLength, "0")}`;

      const medicine = await tx.medicine.create({
        data: {
          code,
          name: data.name,
          genericName: data.genericName,
          brand: data.brand,
          category: data.category,
          form: data.form,
          unit: data.unit,
          hsnCode: data.hsnCode || null,
          gstPercentage: data.gstPercentage,
          purchasePrice: data.purchasePrice,
          sellingPrice: data.sellingPrice,
          minimumStock: data.minimumStock,
          isActive: data.isActive,
          isExpirable: data.isExpirable,
          standardSellingPrice: data.sellingPrice, // Backwards compatibility
          createdBy: employeeId,
        },
      });

      // If expiry date or batch number or initial quantity is specified, create stock record
      const hasStockInfo = data.expiryDate || data.batchNumber || data.initialQuantity;
      if (hasStockInfo) {
        await tx.medicineStock.create({
          data: {
            medicineId: medicine.id,
            batchNumber: data.batchNumber && data.batchNumber.trim() !== "" ? data.batchNumber.trim() : "INITIAL",
            expiryDate: data.expiryDate && data.expiryDate.trim() !== "" ? new Date(data.expiryDate) : null,
            currentQuantity: data.initialQuantity || 0,
            purchaseRate: data.purchasePrice,
            sellingRate: data.sellingPrice,
            gstPercentage: data.gstPercentage,
          }
        });
      }

      // Log Audit
      await logAdminAction({
        action: "MEDICINE_CREATED",
        resource: "Medicine",
        entityId: medicine.id,
        newState: medicine,
        description: `Added medicine master card: ${data.name} [Code: ${code}].`,
      });

      return medicine;
    });
  }

  /**
   * updateMedicine
   * Updates general description metadata for catalog items.
   */
  static async updateMedicine(medicineId: string, data: MedicineMasterInput, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.medicine.findUnique({
        where: { id: medicineId, isDeleted: false },
      });

      if (!existing) throw new AppError("Medicine not found.", 404, "NOT_FOUND");

      // Check if trying to disable medicine and if safe to do so
      if (existing.isActive && !data.isActive) {
        await this.assertSafeToDisable(tx, medicineId);
      }

      const updated = await tx.medicine.update({
        where: { id: medicineId },
        data: {
          name: data.name,
          genericName: data.genericName,
          brand: data.brand,
          category: data.category,
          form: data.form,
          unit: data.unit,
          hsnCode: data.hsnCode || null,
          gstPercentage: data.gstPercentage,
          purchasePrice: data.purchasePrice,
          sellingPrice: data.sellingPrice,
          minimumStock: data.minimumStock,
          isActive: data.isActive,
          isExpirable: data.isExpirable,
          standardSellingPrice: data.sellingPrice,
          updatedBy: employeeId,
        },
      });

      // Log Audit
      await logAdminAction({
        action: "MEDICINE_UPDATED",
        resource: "Medicine",
        entityId: medicineId,
        previousState: existing,
        newState: updated,
        description: `Updated medicine parameters: ${data.name}.`,
      });

      return updated;
    });
  }

  /**
   * assertSafeToDisable
   * Enforces rules checking that active stock or pending case references do not block disabling.
   */
  private static async assertSafeToDisable(tx: Prisma.TransactionClient, medicineId: string) {
    // 1. Active stock check
    const activeStock = await tx.medicineStock.findFirst({
      where: {
        medicineId,
        currentQuantity: { gt: 0 },
        isDeleted: false,
      },
    });

    if (activeStock) {
      throw new AppError(
        "Cannot disable medicine: Active inventory stock still exists in pharmacy database.",
        400,
        "ACTIVE_STOCK_EXISTS"
      );
    }

    // 2. Active billing workflow check (e.g. pending/partially paid invoice containing medicine)
    const pendingSales = await tx.pharmacyInvoiceItem.findFirst({
      where: {
        medicineId,
        isDeleted: false,
        pharmacyInvoice: {
          status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID] },
          isDeleted: false,
        },
      },
    });

    if (pendingSales) {
      throw new AppError(
        "Cannot disable medicine: Referenced in active pending pharmacy sales workflows.",
        400,
        "ACTIVE_WORKFLOW_REFERENCE"
      );
    }
  }

  /**
   * recordPurchase
   * Books supplier stock entries. Enforces purchase idempotency duplicate blocks.
   */
  static async recordPurchase(data: PurchaseEntryInput, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      const orderDate = new Date(data.orderDate);

      // Duplicate Check
      const existingPurchase = await tx.pharmacyPurchaseOrder.findFirst({
        where: {
          invoiceNumber: data.invoiceNumber,
          supplierName: data.supplierName,
          orderDate,
          isDeleted: false,
        },
      });

      if (existingPurchase) {
        throw new AppError(
          "Duplicate purchase entry: A purchase order matching the same Invoice Number, Supplier, and Date already exists.",
          400,
          "DUPLICATE_PURCHASE_ENTRY"
        );
      }

      // Resolve Employee Operator Hospital
      const employee = await tx.employee.findUnique({ where: { id: employeeId } });
      if (!employee) throw new AppError("Operator employee not found.", 404, "NOT_FOUND");

      let totalCost = 0;
      const orderItemsData = [];

      for (const item of data.items) {
        const med = await tx.medicine.findUnique({
          where: { id: item.medicineId, isDeleted: false },
        });

        if (!med) throw new AppError(`Medicine ID ${item.medicineId} not found.`, 404, "NOT_FOUND");
        if (!med.isActive) throw new AppError(`Medicine ${med.name} is disabled. Cannot receive purchase stock.`, 400, "MEDICINE_INACTIVE");

        const expiry = item.expiryDate ? new Date(item.expiryDate) : null;

        // Upsert MedicineStock batch record (version incremental default)
        const existingStock = await tx.medicineStock.findUnique({
          where: {
            medicineId_batchNumber: {
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
            },
          },
        });

        if (existingStock) {
          await tx.medicineStock.update({
            where: { id: existingStock.id },
            data: {
              currentQuantity: { increment: item.quantityReceived },
              purchaseRate: item.purchaseRate,
              sellingRate: item.sellingRate,
              gstPercentage: item.gstPercentage,
              expiryDate: expiry,
              updatedBy: employeeId,
            },
          });
        } else {
          await tx.medicineStock.create({
            data: {
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
              expiryDate: expiry,
              currentQuantity: item.quantityReceived,
              purchaseRate: item.purchaseRate,
              sellingRate: item.sellingRate,
              gstPercentage: item.gstPercentage,
              createdBy: employeeId,
            },
          });
        }

        totalCost += item.purchaseRate * item.quantityReceived;

        orderItemsData.push({
          medicineId: item.medicineId,
          batchNumber: item.batchNumber,
          expiryDate: expiry,
          quantityReceived: item.quantityReceived,
          unitCost: item.purchaseRate,
          purchaseRate: item.purchaseRate,
          sellingRate: item.sellingRate,
          gstPercentage: item.gstPercentage,
          createdBy: employeeId,
        });
      }

      // Create Purchase Order Header
      const purchaseOrder = await tx.pharmacyPurchaseOrder.create({
        data: {
          invoiceNumber: data.invoiceNumber,
          supplierName: data.supplierName,
          orderDate,
          totalCost,
          receivedBy: employeeId,
          remarks: data.remarks || null,
          createdBy: employeeId,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      // Log Audit
      await logAdminAction({
        action: "PURCHASE_ADDED",
        resource: "PharmacyPurchaseOrder",
        entityId: purchaseOrder.id,
        newState: purchaseOrder,
        description: `Logged supplier purchase entry. Invoice: ${data.invoiceNumber}. Total Cost: ₹${totalCost.toFixed(2)}.`,
      });

      return purchaseOrder;
    });
  }

  /**
   * adjustStock
   * Record damages, expiries, lost units, manual corrections. Direct quantity edits blocked.
   */
  static async adjustStock(data: StockAdjustmentInput, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      const stock = await tx.medicineStock.findUnique({
        where: {
          medicineId_batchNumber: {
            medicineId: data.medicineId,
            batchNumber: data.batchNumber,
          },
        },
      });

      if (!stock || stock.isDeleted) {
        throw new AppError("Batch stock reference not found in inventory.", 404, "NOT_FOUND");
      }

      // Resolve signed delta quantity adjustments
      let delta = data.quantity;
      if (
        data.adjustmentType === "DAMAGED" ||
        data.adjustmentType === "EXPIRED" ||
        data.adjustmentType === "LOST"
      ) {
        // Enforce deduction sign logic (subtraction)
        delta = -Math.abs(data.quantity);
      }

      const stockBefore = stock.currentQuantity;
      const stockAfter = stockBefore + delta;

      if (stockAfter < 0) {
        throw new AppError(
          `Insufficient stock. Attempting to adjust stock by ${delta} would drop quantity below zero (Current: ${stockBefore}).`,
          400,
          "INSUFFICIENT_STOCK"
        );
      }

      // Apply adjustment inside transaction
      await tx.medicineStock.update({
        where: { id: stock.id },
        data: {
          currentQuantity: stockAfter,
          updatedBy: employeeId,
        },
      });

      const adjustment = await tx.pharmacyStockAdjustment.create({
        data: {
          medicineId: data.medicineId,
          batchNumber: data.batchNumber,
          adjustmentType: data.adjustmentType as PharmacyAdjustmentType,
          stockBefore,
          quantity: delta,
          stockAfter,
          reason: data.reason,
          employeeId,
          createdBy: employeeId,
        },
      });

      // Log Audit
      await logAdminAction({
        action: "STOCK_ADJUSTED",
        resource: "PharmacyStockAdjustment",
        entityId: adjustment.id,
        newState: adjustment,
        description: `Stock adjusted for batch ${data.batchNumber} (${data.adjustmentType}). Qty Delta: ${delta}. Before: ${stockBefore}, After: ${stockAfter}`,
      });

      return adjustment;
    });
  }

  /**
   * processSale
   * Bills sales transaction. Optimistic locking on deductions, payments total match, and idempotency checks.
   */
  static async processSale(data: PharmacySalesInput, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Resolve Operator Employee Hospital
      const employee = await tx.employee.findUnique({ where: { id: employeeId } });
      if (!employee) throw new AppError("Operator employee not found.", 404, "NOT_FOUND");
      const hospitalId = employee.hospitalId;

      // 2. Validate line items and calculate rates
      let totalAmount = 0; // subtotal
      let discountTotal = 0;
      let taxTotal = 0;
      const invoiceItems = [];

      for (const item of data.items) {
        const med = await tx.medicine.findUnique({
          where: { id: item.medicineId, isDeleted: false },
        });

        if (!med) throw new AppError(`Medicine ID ${item.medicineId} not found.`, 404, "NOT_FOUND");
        if (!med.isActive) throw new AppError(`Medicine ${med.name} is disabled. Cannot bill.`, 400, "MEDICINE_INACTIVE");

        // Fetch batch details
        const stock = await tx.medicineStock.findUnique({
          where: {
            medicineId_batchNumber: {
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
            },
          },
        });

        if (!stock || stock.isDeleted) {
          throw new AppError(`Batch ${item.batchNumber} not found in stock catalog.`, 404, "NOT_FOUND");
        }

        // Active Expiry check
        if (stock.expiryDate && new Date(stock.expiryDate) < new Date()) {
          throw new AppError(
            `Safety block: Batch ${item.batchNumber} of ${med.name} has expired on ${new Date(
              stock.expiryDate
            ).toLocaleDateString()}. Sales are prohibited.`,
            400,
            "MEDICINE_EXPIRED"
          );
        }

        // Available quantity check
        if (stock.currentQuantity < item.quantity) {
          throw new AppError(
            `Insufficient stock for ${med.name} (Batch: ${item.batchNumber}). Requested: ${item.quantity}, Available: ${stock.currentQuantity}.`,
            400,
            "INSUFFICIENT_STOCK"
          );
        }

        const rate = Number(stock.sellingRate);
        const subtotal = rate * item.quantity;
        const discAmt = (subtotal * item.discountPercentage) / 100;
        const gstAmt = ((subtotal - discAmt) * Number(stock.gstPercentage)) / 100;
        const total = subtotal - discAmt + gstAmt;

        totalAmount += subtotal;
        discountTotal += discAmt;
        taxTotal += gstAmt;

        invoiceItems.push({
          medicineId: item.medicineId,
          batchNumber: item.batchNumber,
          quantitySold: item.quantity,
          unitPrice: rate,
          totalPrice: total,
          gstPercentage: stock.gstPercentage,
          discountAmount: discAmt,
          stockId: stock.id,
          version: stock.version,
        });
      }

      const payableAmount = totalAmount - discountTotal + taxTotal;

      // 3. Payments sum match validation
      const paymentSum = data.paymentModes.reduce((acc, p) => acc + p.amount, 0);
      if (Math.abs(paymentSum - payableAmount) > 0.01) {
        throw new AppError(
          `Payment mismatch: Mismatch between sum of payment modes (₹${paymentSum.toFixed(
            2
      )}) and Invoice Payable Amount (₹${payableAmount.toFixed(2)}).`,
          400,
          "PAYMENT_TOTAL_MISMATCH"
        );
      }

      // 4. Idempotency Check (Duplicate block within 30 seconds)
      const recentInvoice = await tx.pharmacyInvoice.findFirst({
        where: {
          customerName: data.customerName,
          payableAmount,
          createdAt: { gte: new Date(Date.now() - 30 * 1000) },
          isDeleted: false,
        },
        include: {
          items: true,
          payments: true,
        },
      });

      if (recentInvoice) {
        // Return existing invoice directly
        return recentInvoice;
      }

      // 5. Deduct stock using Optimistic Locking
      for (const invItem of invoiceItems) {
        const updated = await tx.medicineStock.updateMany({
          where: {
            id: invItem.stockId,
            version: invItem.version,
          },
          data: {
            currentQuantity: { decrement: invItem.quantitySold },
            version: { increment: 1 },
          },
        });

        if (updated.count === 0) {
          throw new AppError(
            "Concurrency stock update conflict. Another checkout transaction modified inventory levels. Please review levels and submit again.",
            409,
            "CONCURRENCY_CONFLICT"
          );
        }

        // Safety gate checking stock didn't drop below 0
        const stockAfter = await tx.medicineStock.findUnique({
          where: { id: invItem.stockId },
        });
        if (stockAfter && stockAfter.currentQuantity < 0) {
          throw new AppError(
            "Safety override: Stock cannot drop below zero. Transaction aborted.",
            400,
            "INSUFFICIENT_STOCK"
          );
        }
      }

      // 6. Generate continuous sequence number
      const sequence = await tx.sequence.upsert({
        where: { sequenceName: "PHARMACY_SALE" },
        update: { currentValue: { increment: 1 } },
        create: {
          sequenceName: "PHARMACY_SALE",
          currentValue: 260001,
          prefix: "PHM",
          paddingLength: 6,
        },
      });

      const runningNo = Number(sequence.currentValue);
      const invoiceNumber = `${sequence.prefix}${runningNo.toString().padStart(sequence.paddingLength, "0")}`;

      // Create Sales Invoice Header and records
      const invoice = await tx.pharmacyInvoice.create({
        data: {
          pharmacyInvoiceNumber: invoiceNumber,
          customerType: "WALK_IN",
          customerName: data.customerName,
          customerPhone: data.customerPhone || null,
          hospitalId,
          totalAmount,
          discountAmount: discountTotal,
          payableAmount,
          receivedBy: employeeId,
          status: "PAID" as InvoiceStatus,
          createdBy: employeeId,
          items: {
            create: invoiceItems.map((iv) => ({
              medicineId: iv.medicineId,
              batchNumber: iv.batchNumber,
              quantitySold: iv.quantitySold,
              unitPrice: iv.unitPrice,
              totalPrice: iv.totalPrice,
              gstPercentage: iv.gstPercentage,
              discountAmount: iv.discountAmount,
            })),
          },
          payments: {
            create: data.paymentModes.map((p) => ({
              paymentMode: p.paymentMode as PaymentMode,
              amount: p.amount,
            })),
          },
        },
        include: {
          items: {
            include: {
              medicine: true,
            },
          },
          payments: true,
        },
      });

      // Log Audit
      await logAdminAction({
        action: "SALE_CREATED",
        resource: "PharmacyInvoice",
        entityId: invoice.id,
        newState: invoice,
        description: `Created sales invoice: ${invoiceNumber}. Customer: ${data.customerName}. Paid: ₹${payableAmount.toFixed(2)}.`,
      });

      return invoice;
    });
  }

  /**
   * processReturn
   * Records partial returns safely. Restores inventory and monitors totals ranges.
   */
  static async processReturn(data: SalesReturnInput, employeeId: string) {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.pharmacyInvoice.findUnique({
        where: { id: data.pharmacyInvoiceId, isDeleted: false },
        include: {
          items: true,
          returns: {
            where: { isDeleted: false },
            include: { items: true },
          },
        },
      });

      if (!invoice) throw new AppError("Sales invoice not found.", 404, "NOT_FOUND");
      if (invoice.status === "CANCELLED") {
        throw new AppError("Cannot return items from a cancelled invoice.", 400, "INVOICE_CANCELLED");
      }

      let refundAmount = 0;
      const returnItemsData = [];

      for (const retItem of data.items) {
        const soldLine = invoice.items.find(
          (line) => line.medicineId === retItem.medicineId && line.batchNumber === retItem.batchNumber
        );

        if (!soldLine) {
          throw new AppError(
            `Selected item (Medicine ID: ${retItem.medicineId}, Batch: ${retItem.batchNumber}) was not sold in this invoice.`,
            400,
            "ITEM_NOT_FOUND"
          );
        }

        // Calculate previously returned quantity for this batch item
        let previouslyReturned = 0;
        invoice.returns.forEach((ret) => {
          const retLine = ret.items.find(
            (line) => line.medicineId === retItem.medicineId && line.batchNumber === retItem.batchNumber
          );
          if (retLine) {
            previouslyReturned += retLine.quantityReturned;
          }
        });

        const maxReturnable = soldLine.quantitySold - previouslyReturned;
        if (retItem.quantityReturned > maxReturnable) {
          throw new AppError(
            `Return safety violation: Attempting to return quantity ${retItem.quantityReturned} which exceeds remaining returnable quantity ${maxReturnable} (Sold: ${soldLine.quantitySold}, Already Returned: ${previouslyReturned}).`,
            400,
            "RETURN_LIMIT_EXCEEDED"
          );
        }

        // Calculate refund rates
        const refundRate = Number(soldLine.unitPrice); // Refund original item price
        const itemRefundTotal = refundRate * retItem.quantityReturned;
        refundAmount += itemRefundTotal;

        // Restore Stock quantity
        const stock = await tx.medicineStock.findUnique({
          where: {
            medicineId_batchNumber: {
              medicineId: retItem.medicineId,
              batchNumber: retItem.batchNumber,
            },
          },
        });

        if (stock) {
          await tx.medicineStock.update({
            where: { id: stock.id },
            data: {
              currentQuantity: { increment: retItem.quantityReturned },
              updatedBy: employeeId,
            },
          });
        }

        returnItemsData.push({
          medicineId: retItem.medicineId,
          batchNumber: retItem.batchNumber,
          quantityReturned: retItem.quantityReturned,
          refundRate,
          totalAmount: itemRefundTotal,
        });
      }

      // Generate continuous return number sequence
      const sequence = await tx.sequence.upsert({
        where: { sequenceName: "PHARMACY_RETURN" },
        update: { currentValue: { increment: 1 } },
        create: {
          sequenceName: "PHARMACY_RETURN",
          currentValue: 260001,
          prefix: "PRT",
          paddingLength: 6,
        },
      });

      const runningNo = Number(sequence.currentValue);
      const returnNumber = `${sequence.prefix}${runningNo.toString().padStart(sequence.paddingLength, "0")}`;

      const salesReturn = await tx.pharmacyReturn.create({
        data: {
          pharmacyInvoiceId: data.pharmacyInvoiceId,
          returnNumber,
          refundAmount,
          reason: data.reason,
          createdBy: employeeId,
          items: {
            create: returnItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      // Log Audit
      await logAdminAction({
        action: "SALE_RETURNED",
        resource: "PharmacyReturn",
        entityId: salesReturn.id,
        newState: salesReturn,
        description: `Processed return receipt: ${returnNumber}. Refund: ₹${refundAmount.toFixed(2)}. Reason: ${data.reason}`,
      });

      return salesReturn;
    });
  }
}
export default PharmacyService;
