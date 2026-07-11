-- Add check constraints to billable_charges
ALTER TABLE billable_charges ADD CONSTRAINT chk_billable_charge_rate CHECK (rate >= 0);
ALTER TABLE billable_charges ADD CONSTRAINT chk_billable_charge_total CHECK ("totalAmount" >= 0);
ALTER TABLE billable_charges ADD CONSTRAINT chk_billable_charge_qty CHECK (quantity >= 0);

-- Add check constraints to invoices
ALTER TABLE invoices ADD CONSTRAINT chk_invoice_total CHECK ("totalAmount" >= 0);
ALTER TABLE invoices ADD CONSTRAINT chk_invoice_discount CHECK ("discountAmount" >= 0);
ALTER TABLE invoices ADD CONSTRAINT chk_invoice_payable CHECK ("payableAmount" >= 0);
ALTER TABLE invoices ADD CONSTRAINT chk_invoice_paid CHECK ("paidAmount" >= 0);
ALTER TABLE invoices ADD CONSTRAINT chk_invoice_balance CHECK ("balanceAmount" >= 0);
ALTER TABLE invoices ADD CONSTRAINT chk_invoice_paid_limit CHECK ("paidAmount" <= "payableAmount");

-- Add check constraints to payments
ALTER TABLE payments ADD CONSTRAINT chk_payment_amount CHECK ("amountPaid" >= 0);

-- Add check constraints to refunds
ALTER TABLE refunds ADD CONSTRAINT chk_refund_amount CHECK ("amountRefunded" >= 0);

-- Add check constraints to medicine_stocks
ALTER TABLE medicine_stocks ADD CONSTRAINT chk_medicine_stock_qty CHECK ("currentQuantity" >= 0);
ALTER TABLE medicine_stocks ADD CONSTRAINT chk_medicine_stock_purchase CHECK ("purchaseRate" >= 0);
ALTER TABLE medicine_stocks ADD CONSTRAINT chk_medicine_stock_selling CHECK ("sellingRate" >= 0);

-- Add check constraints to pharmacy_invoices
ALTER TABLE pharmacy_invoices ADD CONSTRAINT chk_pharmacy_invoice_total CHECK ("totalAmount" >= 0);
ALTER TABLE pharmacy_invoices ADD CONSTRAINT chk_pharmacy_invoice_discount CHECK ("discountAmount" >= 0);
ALTER TABLE pharmacy_invoices ADD CONSTRAINT chk_pharmacy_invoice_payable CHECK ("payableAmount" >= 0);

-- Add check constraints to pharmacy_invoice_items
ALTER TABLE pharmacy_invoice_items ADD CONSTRAINT chk_pharmacy_item_qty CHECK ("quantitySold" >= 0);
ALTER TABLE pharmacy_invoice_items ADD CONSTRAINT chk_pharmacy_item_price CHECK ("unitPrice" >= 0);
ALTER TABLE pharmacy_invoice_items ADD CONSTRAINT chk_pharmacy_item_total CHECK ("totalPrice" >= 0);

-- Add check constraints to pharmacy_returns
ALTER TABLE pharmacy_returns ADD CONSTRAINT chk_pharmacy_return_refund CHECK ("refundAmount" >= 0);