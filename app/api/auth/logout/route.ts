import { NextRequest } from "next/server";
import { destroySession } from "@/modules/auth/services/session";
import { CookieService } from "@/lib/services/cookie-service";
import { wrapRoute } from "@/server/response";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/config/auth";
import crypto from "crypto";

/**
 * POST /api/auth/logout
 * Deletes current session from database, clears HttpOnly/CSRF cookies, and logs auditing metrics.
 */
export const POST = wrapRoute(async (req: NextRequest) => {
  const token = req.cookies.get(AUTH_CONFIG.SESSION_COOKIE_NAME)?.value;
  const clientIp = req.headers.get("x-client-ip") || "127.0.0.1";

  if (token) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    
    // Look up session to log user identification on audit trails
    const session = await prisma.session.findUnique({
      where: { id: tokenHash },
    });

    if (session) {
      await prisma.audit.create({
        data: {
          userId: session.userId,
          action: "LOGOUT",
          resource: "Employee",
          entityId: session.userId,
          clientIp,
          description: `Successful single-device logout.`,
        },
      });
    }

    // Invalidate target session in DB
    await destroySession(token);
  }

  // Clear HTTP cookies
  await CookieService.clearSessionToken();
  await CookieService.clearCsrfToken();

  return { message: "Logged out successfully" };
});
