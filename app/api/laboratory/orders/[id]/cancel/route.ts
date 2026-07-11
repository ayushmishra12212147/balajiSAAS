import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { OrderCancellationSchema } from "@/modules/diagnostics/schemas";
import { DiagnosticsService } from "@/modules/diagnostics/services/diagnostics-service";

/**
 * POST /api/laboratory/orders/[id]/cancel
 * Cancels active laboratory test clinically (does not touch billing records).
 */
export const POST = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Laboratory", "Cancel");

  const { id } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();
  const validated = ValidationService.validate(OrderCancellationSchema, body);

  const cancelledOrder = await DiagnosticsService.cancelLabTest(
    id,
    validated.reason,
    reqContext.employee.id
  );

  return cancelledOrder;
});
