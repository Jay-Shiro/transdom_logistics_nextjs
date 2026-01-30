/**
 * API Configuration and utilities for FastAPI backend integration
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const API_TIMEOUT = parseInt(
  process.env.NEXT_PUBLIC_API_TIMEOUT || "30000",
  10,
);

/**
 * Centralized fetch wrapper with error handling and timeout
 */
export async function apiCall<T>(
  endpoint: string,
  options: RequestInit & { timeout?: number } = {},
): Promise<T> {
  const { timeout = API_TIMEOUT, ...fetchOptions } = options;

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      credentials: "include", // Add this line to include cookies in all requests
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}
/**
 * GET request helper
 */
export function apiGet<T>(
  endpoint: string,
  options?: Omit<RequestInit, "method">,
) {
  return apiCall<T>(endpoint, { ...options, method: "GET" });
}

/**
 * POST request helper
 */
export function apiPost<T>(
  endpoint: string,
  data?: unknown,
  options?: Omit<RequestInit, "method" | "body">,
) {
  return apiCall<T>(endpoint, {
    ...options,
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request helper
 */
export function apiPut<T>(
  endpoint: string,
  data?: unknown,
  options?: Omit<RequestInit, "method" | "body">,
) {
  return apiCall<T>(endpoint, {
    ...options,
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request helper
 */
export function apiDelete<T>(
  endpoint: string,
  options?: Omit<RequestInit, "method">,
) {
  return apiCall<T>(endpoint, { ...options, method: "DELETE" });
}

export { API_BASE_URL };
