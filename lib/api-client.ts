/**
 * Helper to read browser cookie values.
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
 * apiClient
 * Standardized fetch client.
 * Automatically injects CSRF headers on mutating requests (POST, PUT, DELETE, PATCH).
 */
export async function apiClient<T>(url: string, options: RequestInit = {}): Promise<T> {
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
