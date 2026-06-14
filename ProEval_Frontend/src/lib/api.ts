import { API_BASE_URL } from "@/constants";

export interface ApiError {
  detail?: string;
  message?: string;
}

type RequestError = Error & { status?: number; code?: string };

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.loadToken();
  }

  private loadToken() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("access_token");
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<{ data: T; status: number }> {
    const url = `${this.baseURL}${endpoint}`;
    console.log(`[API] Attempting ${options?.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, {
        ...options,
        mode: 'cors',
        headers: {
          ...this.getHeaders(),
          ...options?.headers,
        },
      });

      const contentType = response.headers.get("content-type");
      let data = null;

      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMessage = data?.detail || data?.message || `HTTP ${response.status}`;
        const error = new Error(errorMessage) as RequestError;
        error.status = response.status;
        throw error;
      }

      return { data, status: response.status };
    } catch (error: any) {
      // TypeError: Failed to fetch is the standard browser error for network failures
      if (error instanceof TypeError || error.name === 'TypeError' || error.message === 'Failed to fetch') {
        console.error("[API] Network Connectivity Error:", {
          requestedURL: url,
          errorMessage: error.message,
          errorStack: error.stack,
          errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error)),
          browserOnline: typeof window !== "undefined" ? window.navigator.onLine : "unknown"
        });

        // 1. Logic for automatic fallback between localhost and 127.0.0.1
        let fallbackBaseURL = this.baseURL;
        if (this.baseURL.includes("localhost:8000")) {
          fallbackBaseURL = this.baseURL.replace("localhost:8000", "127.0.0.1:8000");
        } else if (this.baseURL.includes("127.0.0.1:8000")) {
           fallbackBaseURL = this.baseURL.replace("127.0.0.1:8000", "localhost:8000");
        }

        if (fallbackBaseURL !== this.baseURL) {
          console.log(`[API] Retrying with fallback host: ${fallbackBaseURL}${endpoint}`);
          try {
            const fallbackResponse = await fetch(`${fallbackBaseURL}${endpoint}`, {
              ...options,
              mode: 'cors',
              headers: {
                ...this.getHeaders(),
                ...options?.headers,
              },
            });

            const fallbackContentType = fallbackResponse.headers.get("content-type");
            let fallbackData = null;

            if (fallbackContentType?.includes("application/json")) {
              fallbackData = await fallbackResponse.json();
            } else {
              fallbackData = await fallbackResponse.text();
            }

            if (!fallbackResponse.ok) {
              const fallbackErrorMessage =
                fallbackData?.detail || fallbackData?.message || `HTTP ${fallbackResponse.status}`;
              const fallbackError = new Error(fallbackErrorMessage) as RequestError;
              fallbackError.status = fallbackResponse.status;
              throw fallbackError;
            }

            // Success! Permanently update the base URL for this session
            console.log(`[API] Fallback Host ${fallbackBaseURL} is working. Switched.`);
            this.baseURL = fallbackBaseURL;
            return { data: fallbackData, status: fallbackResponse.status };
          } catch (fallbackError: any) {
             console.error("[API] Fallback host also failed:", fallbackError.message);
          }
        }

        // 2. Final error if both failed
        const networkError = new Error(
          `Unable to connect to backend at ${this.baseURL}. Please ensure the Python server is running.`
        ) as RequestError;
        networkError.status = 0;
        networkError.code = "NETWORK_ERROR";
        throw networkError;
      }
      throw error;
    }
  }


  // Convenience methods
  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "GET" });
  }

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
