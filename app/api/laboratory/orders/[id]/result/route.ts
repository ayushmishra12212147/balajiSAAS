import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { LabResultEntrySchema } from "@/modules/diagnostics/schemas";
import { DiagnosticsService } from "@/modules/diagnostics/services/diagnostics-service";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/laboratory/orders/[id]/result
 * Registers lab report parameters, validating permissions and generating revision records on edits.
 */
export const POST = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  const { id } = await (context.params as Promise<{ id: string }>);

  // Determine editing vs first-time entry permissions
  const order = await prisma.labTestOrder.findUnique({
    where: { id, isDeleted: false },
  });

  if (!order) {
    return { error: "Laboratory order not found" }; // DiagnosticsService will throw proper error
  }

  const isEditing = order.status === "COMPLETED";

  if (isEditing) {
    await requirePermission(reqContext.employee.id, "Laboratory", "Edit Result");
  } else {
    await requirePermission(reqContext.employee.id, "Laboratory", "Enter Result");
  }

  const body = await req.json();
  const validated = ValidationService.validate(LabResultEntrySchema, {
    ...body,
    orderId: id,
  });

  const updatedOrder = await DiagnosticsService.enterLabResults(
    validated,
    reqContext.employee.id
  );

  return updatedOrder;
});
