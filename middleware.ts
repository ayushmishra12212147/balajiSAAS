import { NextRequest, NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/config/auth";
import { SECURITY_CONFIG } from "@/config/security";
import { InMemoryRateLimiter } from "@/lib/services/rate-limit-service";

const rateLimiter = new InMemoryRateLimiter();

// Public routes that bypass session validation
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/setup", "/crash"];

/**
 * Next.js Middleware
 * Enforces Request ID generation, CSP security headers, stateless Double-Submit CSRF protection,
 * IP-based rate limiting, and presence of authentication credentials.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip middleware checks for static assets, chunks, and dev files
  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname.startsWith("/api/health")
  ) {
    return NextResponse.next();
  }

  // 2. Request ID generation
  const requestId = crypto.randomUUID();
  
  // Clone request headers to inject the requestId downstream
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  // Determine client IP
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  requestHeaders.set("x-client-ip", clientIp);

  // 3. Rate Limiting Check (Token Bucket / Sliding Window in Edge-compatible JS)
  const isLoginRoute = pathname === "/api/auth/login";
  const limitConfig = isLoginRoute ? SECURITY_CONFIG.RATE_LIMITING.LOGIN : SECURITY_CONFIG.RATE_LIMITING.GLOBAL;
  const rateLimitKey = `${clientIp}:${pathname}`;
  
  const limitResult = await rateLimiter.isLimitExceeded(
    rateLimitKey,
    limitConfig.maxRequests,
    limitConfig.windowMs
  );

  if (!limitResult.success) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: "Too many requests. Please try again later.",
        errorCode: "TOO_MANY_REQUESTS",
        details: { resetTime: new Date(limitResult.reset).toISOString() },
        requestId,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": Math.ceil((limitResult.reset - Date.now()) / 1000).toString(),
          "x-request-id": requestId,
        },
      }
    );
  }

  // 4. Double-Submit CSRF Protection for state-mutating requests
  const method = request.method.toUpperCase();
  const isMutating = ["POST", "PUT", "DELETE", "PATCH"].includes(method);
  const isApiLogin = pathname === "/api/auth/login";

  if (isMutating && !isApiLogin) {
    const csrfCookie = request.cookies.get(AUTH_CONFIG.CSRF_COOKIE_NAME)?.value;
    const csrfHeader = request.headers.get(AUTH_CONFIG.CSRF_HEADER_NAME);

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: "CSRF token validation failed. Request blocked.",
          errorCode: "CSRF_ERROR",
          details: null,
          requestId,
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "x-request-id": requestId,
          },
        }
      );
    }
  }

  // 5. Session token presence check (Verify session exists)
  const sessionToken = request.cookies.get(AUTH_CONFIG.SESSION_COOKIE_NAME)?.value;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path));

  if (!sessionToken && !isPublicPath) {
    // Redirect web requests to login page
    if (!pathname.startsWith("/api/")) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    // Block unauthorized API routes immediately
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: "Authentication session required.",
        errorCode: "UNAUTHORIZED",
        details: null,
        requestId,
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "x-request-id": requestId,
        },
      }
    );
  }

  // If session token is present on the login page, redirect to home page
  if (sessionToken && pathname === "/login") {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  // 6. Build the Next.js response object
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Inject Request ID into the response headers
  response.headers.set("x-request-id", requestId);

  // 7. Inject self-bootstrapping CSRF token if missing
  const existingCsrfCookie = request.cookies.get(AUTH_CONFIG.CSRF_COOKIE_NAME)?.value;
  const existingCsrfClientCookie = request.cookies.get(`${AUTH_CONFIG.CSRF_COOKIE_NAME}_client`)?.value;
  if (!existingCsrfCookie || !existingCsrfClientCookie) {
    const newCsrfToken = crypto.randomUUID();
    response.cookies.set(AUTH_CONFIG.CSRF_COOKIE_NAME, newCsrfToken, AUTH_CONFIG.COOKIE_SETTINGS);
    response.cookies.set(`${AUTH_CONFIG.CSRF_COOKIE_NAME}_client`, newCsrfToken, {
      ...AUTH_CONFIG.COOKIE_SETTINGS,
      httpOnly: false,
    });
  }

  // 8. Inject secure browser headers
  const cspString = Object.entries(SECURITY_CONFIG.CSP_DIRECTIVES)
    .map(([key, val]) => `${key} ${val.join(" ")}`)
    .join("; ");
  response.headers.set("Content-Security-Policy", cspString);
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
}
