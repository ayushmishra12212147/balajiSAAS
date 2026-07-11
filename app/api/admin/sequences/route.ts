import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/sequences
 * Retrieve all registered numbering configurations.
 */
export const GET = wrapAuthRoute(async () => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ManageNumbering");

  const sequences = await prisma.sequence.findMany({
    orderBy: { sequenceName: "asc" },
  });

  // Convert BigInt to string to satisfy JSON serializer
  return sequences.map((s) => ({
    ...s,
    currentValue: String(s.currentValue),
  }));
});
