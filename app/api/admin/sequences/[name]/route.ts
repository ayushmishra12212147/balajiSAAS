import { NextRequest, NextResponse } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { z } from "zod";
import { logAdminAction } from "@/modules/admin/services/audit-service";

const UpdateSequenceSchema = z.object({
  prefix: z.string().max(20).optional(),
  paddingLength: z.number().min(1).max(10).optional(),
  currentValue: z.string().optional(), // Accepted as string to prevent integer overflow on BigInt values
});

interface RouteContext {
  params: Promise<{ name: string }>;
}

/**
 * PUT /api/admin/sequences/[name]
 * Modify prefix, padding, or set starting number.
 * Enforces strictly increasing constraints on sequence currentValue.
 */
export const PUT = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Admin", "ManageNumbering");

  const { name } = await (context as unknown as RouteContext).params;
  const body = await req.json();
  const data = UpdateSequenceSchema.parse(body);

  const result = await prisma.$transaction(async (tx) => {
    const sequence = await tx.sequence.findUnique({
      where: { sequenceName: name },
    });

    if (!sequence) {
      throw new AppError(`Sequence numbering configuration '${name}' not found.`, 404, "NOT_FOUND");
    }

    const previousValue = sequence.currentValue;
    let finalValue = previousValue;

    if (data.currentValue !== undefined) {
      const parsedValue = BigInt(data.currentValue);
      // Correction 8: Never allow decreasing sequence currentValue
      if (parsedValue < previousValue) {
        throw new AppError(
          `Sequence currentValue cannot be decreased from ${String(previousValue)} to ${data.currentValue}. It must remain strictly increasing.`,
          400,
          "BAD_REQUEST"
        );
      }
      finalValue = parsedValue;
    }

    const updated = await tx.sequence.update({
      where: { sequenceName: name },
      data: {
        prefix: data.prefix !== undefined ? data.prefix : sequence.prefix,
        paddingLength: data.paddingLength !== undefined ? data.paddingLength : sequence.paddingLength,
        currentValue: finalValue,
      },
    });

    // Log admin audit action
    await logAdminAction({
      action: "NUMBERING_UPDATE",
      resource: "Sequence",
      entityId: name,
      previousState: {
        prefix: sequence.prefix,
        paddingLength: sequence.paddingLength,
        currentValue: String(sequence.currentValue),
      },
      newState: {
        prefix: updated.prefix,
        paddingLength: updated.paddingLength,
        currentValue: String(updated.currentValue),
      },
      description: `Updated numbering sequence '${name}': prefix='${updated.prefix}', padding=${updated.paddingLength}, currentValue=${String(updated.currentValue)}`,
    });

    return {
      ...updated,
      currentValue: String(updated.currentValue),
    };
  });

  return NextResponse.json(result);
});
