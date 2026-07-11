import { NextResponse } from "next/server";
import { SECURITY_CONFIG } from "@/config/security";

/**
 * SecurityHeaderService
 * Standardizes vulnerability prevention headers for client responses.
 * Implements CSP, Clickjacking (X-Frame-Options), MIME sniff defense, HSTS, and Referrer rules.
 */
export class SecurityHeaderService {
  /**
   * Appends security headers onto the Next.js NextResponse object.
   */
  static apply(response: NextResponse): NextResponse {
    const headers = response.headers;

    // 1. Content Security Policy (CSP)
    const cspString = Object.entries(SECURITY_CONFIG.CSP_DIRECTIVES)
      .map(([key, val]) => `${key} ${val.join(" ")}`)
      .join("; ");
    headers.set("Content-Security-Policy", cspString);

    // 2. HTTP Strict Transport Security (HSTS)
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

    // 3. Prevent Clickjacking (X-Frame-Options)
    headers.set("X-Frame-Options", "DENY");

    // 4. Prevent MIME Sniffing (X-Content-Type-Options)
    headers.set("X-Content-Type-Options", "nosniff");

    // 5. Referrer Policy
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // 6. Permissions Policy (Restrict hardware sensors)
    headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), interest-cohort=()"
    );

    // 7. X-XSS-Protection (Legacy support)
    headers.set("X-XSS-Protection", "1; mode=block");

    return response;
  }
}
