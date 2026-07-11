import { NextRequest } from "next/server";
import { validateSession } from "./session";
import { AuthenticationError } from "@/server/errors";
import { wrapRoute } from "@/server/response";
import { AUTH_CONFIG } from "@/config/auth";
import { prisma } from "@/lib/prisma";
import { RequestContextService } from "@/lib/services/request-context-service";

/**
 * wrapAuthRoute
 * Route wrapper that enforces session validation, sets up the RequestContext inside
 * AsyncLocalStorage, and executes the handler.
 */
export function wrapAuthRoute<T>(
  handler: (req: NextRequest, context: any) => Promise<T>
) {
  return wrapRoute(async (req: NextRequest, context: any) => {
    // 1. Extract session token from cookie
    const token = req.cookies.get(AUTH_CONFIG.SESSION_COOKIE_NAME)?.value;
    
    if (!token) {
      throw new AuthenticationError("Authentication session required");
    }

    // 2. Validate session against the database (includes active checks for employee & hospital)
    const { session, employee } = await validateSession(token);

    // 3. Fetch permissions for the employee
    const permissions = await prisma.permission.findMany({
      where: { userId: employee.id, isAllowed: true },
      select: { module: true, action: true },
    });
    
    const permissionStrings = permissions.map((p) => `${p.module}:${p.action}`);

    // 4. Build RequestContext object
    const requestContext = {
      employee,
      hospital: employee.hospital,
      permissions: permissionStrings,
      session: {
        userId: session.userId,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        isActive: session.isActive,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      sessionIdHash: session.id,
      requestId: req.headers.get("x-request-id") || "unknown",
      ipAddress: req.headers.get("x-client-ip") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "unknown",
    };

    // 5. Run the route handler within the request-scoped context
    return RequestContextService.run(requestContext, async () => {
      // Security Interlocks Checks (Except for SUPER_ADMIN users)
      const isSuperAdmin = employee.role === "SUPER_ADMIN";
      const pathname = req.nextUrl.pathname;

      if (!isSuperAdmin) {
        // Maintenance mode interlock
        const { MaintenanceService } = await import("@/modules/admin/services/maintenance-service");
        const maintenanceActive = await MaintenanceService.isMaintenanceActive();
        if (maintenanceActive) {
          const bypassPaths = [
            "/api/auth/login",
            "/api/auth/logout",
            "/api/admin/license",
            "/api/admin/maintenance",
            "/api/health"
          ];
          const isBypass = bypassPaths.some((p) => pathname === p || pathname.startsWith(p));
          if (!isBypass) {
            const message = await MaintenanceService.getMaintenanceMessage();
            const { AppError } = await import("@/server/errors");
            throw new AppError(message, 503, "MAINTENANCE_MODE");
          }
        }

        // License expiry transaction interlock
        const { LicenseService } = await import("@/modules/admin/services/license-service");
        const license = await LicenseService.getLicenseStatus();
        if (license.isExpired && license.blockOnExpiry) {
          const isMutation = ["POST", "PUT", "DELETE", "PATCH"].includes(req.method.toUpperCase());
          if (isMutation) {
            const bypassPaths = [
              "/api/auth/logout",
              "/api/admin/license",
              "/api/admin/maintenance"
            ];
            const isBypass = bypassPaths.some((p) => pathname === p || pathname.startsWith(p));
            if (!isBypass) {
              const { AppError } = await import("@/server/errors");
              throw new AppError("Hospital license is expired. Business transactions are locked.", 403, "LICENSE_EXPIRED");
            }
          }
        }
      }

      return handler(req, context);
    });
  });
}
