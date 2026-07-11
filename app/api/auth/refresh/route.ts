
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";

/**
 * POST /api/auth/refresh
 * Explicit session renewal endpoint. The session validation layer auto-renews the session
 * expiry if it falls within the configured renewal window.
 */
export const POST = wrapAuthRoute(async () => {
  return { message: "Session refreshed successfully" };
});
