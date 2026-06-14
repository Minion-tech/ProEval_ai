import { apiClient } from "./api";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  name: string;
  enrollment_no: string;
  password: string;
  department: string;
  programme: string;
  batch: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "ADMIN";
  department?: string;
  enrollment_no?: string;
  programme?: string;
  batch?: string;
}

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>("/auth/login", credentials);
    if (data?.access_token) {
      apiClient.setToken(data.access_token);
    }
    return data;
  },

  async register(payload: RegisterRequest): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>(
      "/auth/register",
      payload
    );
    return data;
  },

  async verifyOTP(payload: VerifyOTPRequest): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>("/auth/verify", payload);
    if (data?.access_token) {
      apiClient.setToken(data.access_token);
    }
    return data;
  },

  async getCurrentUser(): Promise<UserProfile> {
    const { data } = await apiClient.get<UserProfile>("/auth/me");
    return data;
  },

  logout() {
    apiClient.clearToken();
  },

  isAuthenticated(): boolean {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("access_token");
    }
    return false;
  },
};
