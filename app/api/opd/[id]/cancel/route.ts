import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { OPDCancellationSchema } from "@/modules/opd/schemas";
import { OPDService } from "@/modules/opd/services/opd-service";

/**
 * POST /api/opd/[id]/cancel
 * Cancels active outpatient encounter, scheduled orders, and associated pending charges.
 */
export const POST = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "OPD", "Cancel");

  const { id } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();
  const validated = ValidationService.validate(OPDCancellationSchema, body);

  const cancelledOpd = await OPDService.cancelOPD(
    id,
    validated.reason,
    reqContext.employee.id
  );

  return cancelledOpd;
});
