/**
 * Centralized API utility for making authenticated requests
 * Handles token management with better security practices
 * 
 * SECURITY NOTE: While we currently use localStorage for token storage,
 * this should be migrated to httpOnly cookies in the future for better XSS protection.
 * For now, ensure:
 * 1. Always use HTTPS in production (Vercel handles this)
 * 2. Implement Content Security Policy
 * 3. Sanitize all user inputs to prevent XSS
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Get authentication token from localStorage
 * Checks multiple possible key names for backward compatibility
 */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  
  // Check for token in localStorage - try multiple keys
  return localStorage.getItem("token") || 
         localStorage.getItem("access_token") || 
         null;
}

/**
 * Clear all authentication data
 */
function clearAuthData(): void {
  if (typeof window === "undefined") return;
  
  // Clear all possible token keys
  localStorage.removeItem("token");
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
  localStorage.removeItem("refreshToken");
}

/**
 * Custom fetch wrapper that automatically handles authentication
 */
export async function apiFetch(endpoint: string, options: RequestOptions = {}) {
  const { skipAuth = false, headers = {}, ...restOptions } = options;

  // Get token using secure method
  const token = getAuthToken();

  // Build headers
  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...headers,
  };

  // Add auth header if not skipped and token exists
  if (!skipAuth && token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  // Make the request
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
  });

  // Handle 401 Unauthorized - token might be expired
  if (response.status === 401 && !skipAuth) {
    // Clear all auth data
    clearAuthData();
    
    // Redirect to login if not already there
    if (typeof window !== "undefined" && !window.location.pathname.includes("/auth/login")) {
      window.location.href = "/auth/login";
    }
    
    throw new Error("Authentication required. Please log in again.");
  }

  return response;
}

/**
 * GET request helper
 */
export async function apiGet<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: "GET",
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `GET ${endpoint} failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * POST request helper
 */
export async function apiPost<T = any>(
  endpoint: string,
  data?: any,
  options: RequestOptions = {}
): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `POST ${endpoint} failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * PUT request helper
 */
export async function apiPut<T = any>(
  endpoint: string,
  data?: any,
  options: RequestOptions = {}
): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `PUT ${endpoint} failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: "DELETE",
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `DELETE ${endpoint} failed with status ${response.status}`);
  }

  // Some DELETE requests might not return content
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  
  return {} as T;
}

export { API_BASE_URL };
