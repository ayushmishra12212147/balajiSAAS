import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { OTService } from "@/modules/ot/services/ot-service";

/**
 * POST /api/ot/[id]/cancel
 * Cancels active scheduled operation, updating PENDING billable charges.
 */
export const POST = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "OT", "Register");

  const { id } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();
  const reason = body.reason || "Surgical scheduling cancellation.";

  const cancelled = await OTService.cancelOT(
    id,
    reason,
    reqContext.employee.id
  );

  return cancelled;
});
