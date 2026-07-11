import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { DoctorReassignmentSchema } from "@/modules/ipd/schemas";
import { IPDService } from "@/modules/ipd/services/ipd-service";

/**
 * POST /api/ipd/admissions/[id]/reassign-doctor
 * Reassigns the primary clinical doctor for active inpatient.
 */
export const POST = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "IPD", "Reassign Doctor");

  const { id } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();
  const validated = ValidationService.validate(DoctorReassignmentSchema, body);

  const updatedAdmission = await IPDService.reassignDoctor(
    id,
    validated,
    reqContext.employee.id
  );

  return updatedAdmission;
});
