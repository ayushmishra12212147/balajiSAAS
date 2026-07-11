import { prisma } from "@/lib/prisma";
import { AppError, AuthenticationError } from "@/server/errors";
import { AUTH_CONFIG } from "@/config/auth";
import crypto from "crypto";
import { securityLogger } from "@/lib/logger";

/**
 * Generates a random session token and stores its SHA-256 hash in the database.
 * Returns the raw token string (to be sent to the client via HttpOnly cookie).
 */
export async function createSession(
  employeeId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  // Enforce concurrent session limit (max 5)
  const activeSessions = await prisma.session.findMany({
    where: { userId: employeeId, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (activeSessions.length >= 5) {
    const excessCount = activeSessions.length - 5 + 1;
    const sessionsToTerminate = activeSessions.slice(0, excessCount);
    const sessionIdsToTerminate = sessionsToTerminate.map((s) => s.id);

    await prisma.session.deleteMany({
      where: { id: { in: sessionIdsToTerminate } },
    });

    securityLogger.warn(
      `Terminated ${excessCount} oldest concurrent session(s) for employee: ${employeeId} to enforce concurrent limit.`
    );
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + AUTH_CONFIG.SESSION_EXPIRY_HOURS);

  await prisma.session.create({
    data: {
      id: tokenHash, // Database stores SHA-256 hash in id field (no schema change)
      userId: employeeId,
      expiresAt,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      isActive: true,
    },
  });

  return rawToken;
}

/**
 * Validates a raw session token.
 * Computes hash, looks up session, verifies active status of employee/hospital,
 * and handles automatic renewal.
 */
export async function validateSession(rawToken: string) {
  if (!rawToken) {
    throw new AuthenticationError("Session token is missing");
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  // Fetch session, including user (Employee) and hospital (Tenant)
  const session = await prisma.session.findUnique({
    where: { id: tokenHash },
    include: {
      user: {
        include: {
          hospital: true,
        },
      },
    },
  });

  if (!session || !session.isActive) {
    throw new AuthenticationError("Session is invalid or has been terminated");
  }

  const now = new Date();

  // 1. Session Expiration check
  if (session.expiresAt < now) {
    await destroySession(rawToken);
    throw new AuthenticationError("Session has expired");
  }

  const employee = session.user;

  // 2. Associated Hospital active check
  if (!employee.hospital || employee.hospital.isDeleted || employee.hospital.isDeleted) {
    await destroySession(rawToken);
    throw new AuthenticationError("Associated hospital tenant is inactive");
  }

  // 3. Employee account active check (instant logout)
  if (!employee.isActive || employee.isDeleted) {
    await destroySession(rawToken);
    securityLogger.warn(
      `Session terminated because employee account was deactivated. Employee ID: ${employee.id}`
    );
    throw new AuthenticationError("Account has been deactivated. Please contact an Administrator.");
  }

  // 4. Brute force lock check
  if (employee.lockedUntil && employee.lockedUntil > now) {
    throw new AuthenticationError("Account is temporarily locked. Try again later.");
  }

  // 5. Password age enforcement (90 days)
  const passwordAgeLimitDays = 90;
  const passwordAgeMs = now.getTime() - new Date(employee.passwordChangedAt).getTime();
  const passwordAgeDays = passwordAgeMs / (1000 * 60 * 60 * 24);

  if (passwordAgeDays > passwordAgeLimitDays) {
    throw new AppError("Your password has expired and must be updated.", 403, "PASSWORD_EXPIRED");
  }

  // 6. Session auto-renewal check
  const renewalThresholdMs = AUTH_CONFIG.SESSION_RENEWAL_WINDOW_HOURS * 60 * 60 * 1000;
  const timeRemainingMs = session.expiresAt.getTime() - now.getTime();

  if (timeRemainingMs < renewalThresholdMs) {
    const extendedExpiresAt = new Date();
    extendedExpiresAt.setHours(extendedExpiresAt.getHours() + AUTH_CONFIG.SESSION_EXPIRY_HOURS);
    
    await prisma.session.update({
      where: { id: tokenHash },
      data: { expiresAt: extendedExpiresAt },
    });
  }

  return { session, employee };
}

/**
 * Invalidates a session by deleting it from the database.
 */
export async function destroySession(rawToken: string) {
  try {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await prisma.session.delete({
      where: { id: tokenHash },
    });
  } catch {
    // Ignore error if session is already invalidated
  }
}

/**
 * Invalidates all sessions associated with a specific employee (logout all devices).
 */
export async function destroyAllSessionsForUser(employeeId: string) {
  try {
    await prisma.session.deleteMany({
      where: { userId: employeeId },
    });
  } catch {
    // Ignore error
  }
}

/**
 * Handles failed login tracking, triggering temporary lockouts if needed.
 */
export async function handleFailedLogin(email: string) {
  const employee = await prisma.employee.findUnique({
    where: { email },
  });

  if (!employee) return;

  const newCount = employee.failedLoginCount + 1;
  let lockedUntil: Date | null = null;

  if (newCount >= AUTH_CONFIG.MAX_FAILED_LOGIN_ATTEMPTS) {
    lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + AUTH_CONFIG.LOCKOUT_DURATION_MINUTES);
    securityLogger.warn(
      `User account locked due to excessive failures. Email: ${email}. Failures: ${newCount}. Locked until: ${lockedUntil.toISOString()}`
    );
  }

  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      failedLoginCount: newCount,
      lockedUntil,
    },
  });
}

/**
 * Resets brute force login failure limits.
 */
export async function resetFailedLogin(employeeId: string) {
  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
}
