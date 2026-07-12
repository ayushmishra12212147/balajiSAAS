import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { ChargeAssignmentSchema } from "@/modules/ipd/schemas";
import { IPDService } from "@/modules/ipd/services/ipd-service";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";

/**
 * POST /api/ipd/admissions/[id]/assign-charge
 * Assigns clinical or procedure charges to the inpatient's ledger.
 */
export const POST = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "IPD", "Assign Charges");

  const { id } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();

  if (Array.isArray(body)) {
    const results = [];
    for (const item of body) {
      const validated = ValidationService.validate(ChargeAssignmentSchema, item);
      const charge = await IPDService.assignCharge(
        id,
        validated,
        reqContext.employee.id
      );
      results.push(charge);
    }
    return results;
  } else {
    const validated = ValidationService.validate(ChargeAssignmentSchema, body);
    const charge = await IPDService.assignCharge(
      id,
      validated,
      reqContext.employee.id
    );
    return charge;
  }
});

/**
 * DELETE /api/ipd/admissions/[id]/assign-charge
 * Removes (soft-deletes) a billable charge from the inpatient's ledger.
 * Only PENDING charges that haven't been invoiced can be removed.
 */
export const DELETE = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "IPD", "Assign Charges");

  const { id } = await (context.params as Promise<{ id: string }>);
  const body = await req.json();
  const chargeId = body.chargeId;

  if (!chargeId) {
    throw new AppError("Charge ID is required.", 400, "BAD_REQUEST");
  }

  const charge = await prisma.billableCharge.findUnique({
    where: { id: chargeId, isDeleted: false },
    include: { chargeCatalog: true },
  });

  if (!charge) {
    throw new AppError("Charge not found.", 404, "NOT_FOUND");
  }

  if (charge.sourceEntityId !== id || charge.sourceModule !== "IPD") {
    throw new AppError("Charge does not belong to this admission.", 400, "BAD_REQUEST");
  }

  if (charge.billingStatus !== "PENDING") {
    throw new AppError("Only pending (un-invoiced) charges can be removed.", 400, "CHARGE_INVOICED");
  }

  await prisma.billableCharge.update({
    where: { id: chargeId },
    data: { isDeleted: true },
  });

  await logAdminAction({
    action: "CHARGE_REMOVED",
    resource: "BillableCharge",
    entityId: chargeId,
    description: `Removed charge ${charge.chargeCatalog.name} (₹${Number(charge.totalAmount).toFixed(2)}) from IPD admission ${id}.`,
  });

  return { success: true, removedChargeId: chargeId };
});

