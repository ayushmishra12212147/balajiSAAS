/**
 * Client-side CSRF cookie extractor.
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
}

/**
 * Custom fetch client that automatically attaches CSRF verification headers
 * on state-mutating requests (POST, PUT, DELETE, PATCH).
 */
async function clientFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const method = (options.method || "GET").toUpperCase();

  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const csrfToken = getCookie("sgh_csrf_token_client");
    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
    }
  }

  headers.set("Content-Type", "application/json");

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || "An unexpected error occurred.");
  }

  // Returns data payload from standard success structure { success: true, message: "...", data: T }
  return json.data as T;
}

/**
 * AuthClient
 * Exposes login, logout, password updates, and context profile querying to client components.
 */
export const AuthClient = {
  /**
   * Submits credentials to login API handler.
   */
  async login(email: string, password: string) {
    return clientFetch<{
      id: string;
      email: string;
      role: string;
      designation: string;
      hospitalName: string;
      permissions: string[];
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * Invalidate current session.
   */
  async logout() {
    return clientFetch<{ message: string }>("/api/auth/logout", {
      method: "POST",
    });
  },

  /**
   * Invalidate all user sessions.
   */
  async logoutAll() {
    return clientFetch<{ message: string }>("/api/auth/logout-all", {
      method: "POST",
    });
  },

  /**
   * Request password updates.
   */
  async changePassword(passwordData: Record<string, string>) {
    return clientFetch<{ message: string }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(passwordData),
    });
  },

  /**
   * Queries currently authenticated profile.
   */
  async me() {
    return clientFetch<{
      id: string;
      email: string;
      role: string;
      designation: string;
      hospitalName: string;
      permissions: string[];
    }>("/api/auth/me");
  },
};
