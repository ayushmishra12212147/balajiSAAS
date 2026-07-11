import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PasswordService } from "@/modules/auth/services/password-provider";
import {
  createSession,
  handleFailedLogin,
  resetFailedLogin,
} from "@/modules/auth/services/session";
import { CookieService } from "@/lib/services/cookie-service";
import { ValidationService } from "@/lib/validation";
import { wrapRoute } from "@/server/response";
import { AuthenticationError } from "@/server/errors";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * POST /api/auth/login
 * Standard login route handler. Enforces timing attack protections, brute force limits,
 * session hashing, HttpOnly cookie registration, and security audits.
 */
export const POST = wrapRoute(async (req: NextRequest) => {
  const body = await req.json();
  const { email, password } = ValidationService.validate(loginSchema, body);

  const clientIp = req.headers.get("x-client-ip") || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "unknown";

  // 1. Fetch employee
  const employee = await prisma.employee.findUnique({
    where: { email },
    include: { hospital: true },
  });

  // Anti-timing attack dummy comparison if email does not exist
  if (!employee || employee.isDeleted) {
    const dummyHash = PasswordService.getActiveProviderName() === "Argon2Provider"
      ? "$argon2id$v=19$m=65536,t=3,p=4$qgx6CHr3NkdJBB9IKzYWuw$dummyhashvalue"
      : "$2a$12$LJH2sA0T1/ZtU3e2L2s01u9D.dummyhashvaluesalt";
    await PasswordService.compare(password, dummyHash);
    
    // Log failed login audit for non-existent account
    await prisma.audit.create({
      data: {
        action: "LOGIN_FAILED",
        resource: "Employee",
        clientIp,
        description: `Failed login attempt for non-existent email: ${email}`,
      },
    });

    throw new AuthenticationError("Invalid email or password");
  }

  // 2. Lockout status check
  const now = new Date();
  if (employee.lockedUntil && employee.lockedUntil > now) {
    throw new AuthenticationError(
      `Account is temporarily locked. Try again after ${employee.lockedUntil.toLocaleTimeString()}`
    );
  }

  // 3. Password Verification
  const isMatch = await PasswordService.compare(password, employee.passwordHash);

  if (!isMatch) {
    // Increment failed login and lock account if limit reached
    await handleFailedLogin(email);

    await prisma.audit.create({
      data: {
        userId: employee.id,
        action: "LOGIN_FAILED",
        resource: "Employee",
        entityId: employee.id,
        clientIp,
        description: `Failed login attempt for employee: ${email}`,
      },
    });

    throw new AuthenticationError("Invalid email or password");
  }

  // 4. Verify Hospital & Employee active states
  if (employee.hospital.isDeleted) {
    throw new AuthenticationError("Associated hospital tenant is deactivated");
  }

  if (!employee.isActive) {
    throw new AuthenticationError("Account is deactivated. Please contact an Administrator.");
  }

  // 5. Success Flow: reset lock metrics and update login IP / last login timestamp
  await resetFailedLogin(employee.id);

  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      lastLoginAt: now,
      lastLoginIp: clientIp,
    },
  });

  // 6. Generate session token and HttpOnly cookie
  const rawToken = await createSession(employee.id, clientIp, userAgent);
  await CookieService.setSessionToken(rawToken);

  // 7. Fetch permissions for the employee
  const permissions = await prisma.permission.findMany({
    where: { userId: employee.id, isAllowed: true },
    select: { module: true, action: true },
  });
  
  const permissionStrings = permissions.map((p) => `${p.module}:${p.action}`);

  // 8. Write Audit Log
  await prisma.audit.create({
    data: {
      userId: employee.id,
      action: "LOGIN",
      resource: "Employee",
      entityId: employee.id,
      clientIp,
      description: `Successful login for employee ${employee.email} using ${PasswordService.getActiveProviderName()}`,
    },
  });

  return {
    id: employee.id,
    email: employee.email,
    employeeCode: employee.employeeCode,
    role: employee.role,
    designation: employee.designation,
    hospitalName: employee.hospital.name,
    permissions: permissionStrings,
  };
});
