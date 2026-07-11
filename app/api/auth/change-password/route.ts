import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PasswordService } from "@/modules/auth/services/password-provider";
import { ValidationService } from "@/lib/validation";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { AppError } from "@/server/errors";
import { AUTH_CONFIG } from "@/config/auth";
import crypto from "crypto";

const changePasswordSchema = z.object({
  oldPassword: z.string().min(8, "Old password must be at least 8 characters"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .refine((val) => /[A-Z]/.test(val), {
      message: "Password must contain at least one uppercase letter",
    })
    .refine((val) => /[0-9]/.test(val), {
      message: "Password must contain at least one number",
    })
    .refine((val) => /[^A-Za-z0-9]/.test(val), {
      message: "Password must contain at least one special character",
    }),
});

/**
 * POST /api/auth/change-password
 * Updates password credentials for the logged-in employee.
 * Automatically hashes new password, invalidates other devices, and logs audit events.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const body = await req.json();
  const { oldPassword, newPassword } = ValidationService.validate(changePasswordSchema, body);

  const context = RequestContextService.getRequired();
  const employeeId = context.employee.id;
  const clientIp = context.ipAddress;

  // 1. Fetch active Employee details to verify password (ensure fresh check)
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new AppError("Employee account not found", 404, "NOT_FOUND");
  }

  // 2. Validate old password match
  const isMatch = await PasswordService.compare(oldPassword, employee.passwordHash);
  if (!isMatch) {
    throw new AppError("Invalid current password", 400, "BAD_REQUEST");
  }

  // 3. Prevent reuse of same password
  const isSamePassword = await PasswordService.compare(newPassword, employee.passwordHash);
  if (isSamePassword) {
    throw new AppError("New password cannot be the same as old password", 400, "BAD_REQUEST");
  }

  // 4. Hash new password and update in DB
  const hashedNewPassword = await PasswordService.hash(newPassword);
  
  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      passwordHash: hashedNewPassword,
      passwordChangedAt: new Date(),
    },
  });

  // 5. Invalidate all OTHER active sessions for this user for security
  const currentToken = req.cookies.get(AUTH_CONFIG.SESSION_COOKIE_NAME)?.value;
  if (currentToken) {
    const tokenHash = crypto.createHash("sha256").update(currentToken).digest("hex");
    await prisma.session.deleteMany({
      where: {
        userId: employeeId,
        id: { not: tokenHash },
      },
    });
  }

  // 6. Write Audit Log
  await prisma.audit.create({
    data: {
      userId: employeeId,
      action: "CHANGE_PASSWORD",
      resource: "Employee",
      entityId: employeeId,
      clientIp,
      description: `Password updated successfully. Other device sessions revoked.`,
    },
  });

  return { message: "Password updated successfully" };
});
