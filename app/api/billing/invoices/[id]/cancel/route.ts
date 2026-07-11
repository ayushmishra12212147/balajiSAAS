import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { CancelInvoiceSchema } from "@/modules/billing/schemas";
import { BillingService } from "@/modules/billing/services/billing-service";

/**
 * POST /api/billing/invoices/[id]/cancel
 * Cancels active invoice and releases charges.
 */
export const POST = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Billing", "Cancel Invoice");

  const { id } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();
  const validated = ValidationService.validate(CancelInvoiceSchema, body);

  const cancelledInvoice = await BillingService.cancelInvoice(
    id,
    validated.reason,
    reqContext.employee.id
  );

  return cancelledInvoice;
});
