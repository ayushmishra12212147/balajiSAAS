import { cookies } from "next/headers";
import { AUTH_CONFIG } from "@/config/auth";

/**
 * CookieService
 * Provides abstraction for session and CSRF cookie operations on the server side.
 * Automatically respects HttpOnly, SameSite, Secure, and path boundaries.
 */
export class CookieService {
  /**
   * Writes the HttpOnly session token cookie.
   */
  static async setSessionToken(token: string) {
    const cookieStore = await cookies();
    cookieStore.set(AUTH_CONFIG.SESSION_COOKIE_NAME, token, {
      ...AUTH_CONFIG.COOKIE_SETTINGS,
      maxAge: AUTH_CONFIG.SESSION_EXPIRY_HOURS * 60 * 60,
    });
  }

  /**
   * Retrieves the raw session token from incoming cookies.
   */
  static async getSessionToken(): Promise<string | undefined> {
    const cookieStore = await cookies();
    return cookieStore.get(AUTH_CONFIG.SESSION_COOKIE_NAME)?.value;
  }

  /**
   * Deletes the session token cookie.
   */
  static async clearSessionToken() {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_CONFIG.SESSION_COOKIE_NAME);
  }

  /**
   * Generates matching HTTP-only and client-readable CSRF cookies.
   */
  static async setCsrfToken(token: string) {
    const cookieStore = await cookies();
    // HTTP-only verification token
    cookieStore.set(AUTH_CONFIG.CSRF_COOKIE_NAME, token, AUTH_CONFIG.COOKIE_SETTINGS);
    
    // Client-accessible token
    cookieStore.set(`${AUTH_CONFIG.CSRF_COOKIE_NAME}_client`, token, {
      ...AUTH_CONFIG.COOKIE_SETTINGS,
      httpOnly: false,
    });
  }

  /**
   * Retrieves the HTTP-only CSRF verification token.
   */
  static async getCsrfToken(): Promise<string | undefined> {
    const cookieStore = await cookies();
    return cookieStore.get(AUTH_CONFIG.CSRF_COOKIE_NAME)?.value;
  }

  /**
   * Deletes all CSRF-related cookies.
   */
  static async clearCsrfToken() {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_CONFIG.CSRF_COOKIE_NAME);
    cookieStore.delete(`${AUTH_CONFIG.CSRF_COOKIE_NAME}_client`);
  }
}
