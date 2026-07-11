import { NextRequest } from "next/server";
import { z } from "zod";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { EmployeeService } from "@/modules/admin/services/employee-service";

const resetPasswordInputSchema = z.object({
  passwordRaw: z.string().min(8, "Password must be at least 8 characters long"),
});

/**
 * POST /api/admin/employees/[id]/reset-password
 * Administratively overrides passwords for a specific employee.
 * Forces user logout across all sessions.
 */
export const POST = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Admin", "ManageUsers");

  const { id } = await (context.params as Promise<{ id: string }>);

  const body = await req.json();
  const { passwordRaw } = ValidationService.validate(resetPasswordInputSchema, body);

  await EmployeeService.resetPassword(id, passwordRaw);

  return { message: "Password reset successfully. Active sessions revoked." };
});
