import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { OTService } from "@/modules/ot/services/ot-service";

/**
 * POST /api/ot/[id]/close
 * Closes operation clinically. Sets completion timestamps and freezes charges.
 */
export const POST = wrapAuthRoute(async (_req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "OT", "Close Operation");

  const { id } = await (context.params as Promise<{ id: string }>);

  const completed = await OTService.closeOperation(
    id,
    reqContext.employee.id
  );

  return completed;
});
