import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { RadiologyReportSchema } from "@/modules/diagnostics/schemas";
import { DiagnosticsService } from "@/modules/diagnostics/services/diagnostics-service";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/radiology/orders/[id]/report
 * Registers scan findings report, validating permissions and generating revision records on edits.
 */
export const POST = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  const { id } = await (context.params as Promise<{ id: string }>);

  // Determine editing vs first-time entry permissions
  const order = await prisma.radiologyScanOrder.findUnique({
    where: { id, isDeleted: false },
  });

  if (!order) {
    return { error: "Radiology scan order not found" }; // DiagnosticsService will throw proper error
  }

  const isEditing = order.status === "COMPLETED";

  if (isEditing) {
    await requirePermission(reqContext.employee.id, "Radiology", "Edit Report");
  } else {
    await requirePermission(reqContext.employee.id, "Radiology", "Enter Report");
  }

  const body = await req.json();
  const validated = ValidationService.validate(RadiologyReportSchema, {
    ...body,
    orderId: id,
  });

  const updatedOrder = await DiagnosticsService.enterRadiologyReport(
    validated,
    reqContext.employee.id
  );

  return updatedOrder;
});
