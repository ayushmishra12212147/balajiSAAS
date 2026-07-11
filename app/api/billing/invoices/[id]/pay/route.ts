import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { ReceivePaymentSchema } from "@/modules/billing/schemas";
import { BillingService } from "@/modules/billing/services/billing-service";

/**
 * POST /api/billing/invoices/[id]/pay
 * Registers invoice payments, checking for duplicate submission blocks and sums validity.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Billing", "Receive Payment");

  const body = await req.json();
  const validated = ValidationService.validate(ReceivePaymentSchema, body);

  const updatedInvoice = await BillingService.receivePayment(
    validated,
    reqContext.employee.id
  );

  return updatedInvoice;
});
