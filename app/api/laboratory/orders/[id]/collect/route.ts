import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { DiagnosticsService } from "@/modules/diagnostics/services/diagnostics-service";

/**
 * POST /api/laboratory/orders/[id]/collect
 * Marks test order status as SAMPLE_COLLECTED, checking payment status.
 */
export const POST = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Laboratory", "Collect Sample");

  const { id } = await (context.params as Promise<{ id: string }>);

  const updatedOrder = await DiagnosticsService.collectSample(
    id,
    reqContext.employee.id
  );

  return updatedOrder;
});
