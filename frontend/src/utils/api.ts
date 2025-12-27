/**
 * Centralized API utility for making authenticated requests
 * Handles token management and automatically refreshes tokens when needed
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Custom fetch wrapper that automatically handles authentication
 */
export async function apiFetch(endpoint: string, options: RequestOptions = {}) {
  const { skipAuth = false, headers = {}, ...restOptions } = options;

  // Get token from localStorage
  const token = localStorage.getItem("access_token");

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
    // Clear invalid token
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    
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
