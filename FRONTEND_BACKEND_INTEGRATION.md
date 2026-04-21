# Frontend-Backend Integration Guide

## Project Overview
- **Backend:** FastAPI (Python) running on `http://localhost:8000`
- **Frontend:** Next.js 16 (TypeScript/React) running on `http://localhost:3000`
- **Database:** PostgreSQL (async with asyncpg)
- **Authentication:** JWT-based

---

## 1. Backend Setup (Prerequisites)

### Step 1: Configure Backend Environment
Create a `.env` file in the `backend/` directory:

```env
# Core Settings
PROJECT_NAME=proeval
API_V1_STR=/api/v1
DEBUG=True

# CORS Configuration (Allow frontend origin)
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]

# Database
DATABASE_URL=postgresql+asyncpg://postgres:Nabskhan%40123@localhost:5432/proeval

# Authentication
JWT_SECRET=your-super-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=11520

# AI Integration
ANTHROPIC_API_KEY=your-anthropic-api-key
CLAUDE_MODEL=claude-sonnet-4-6
```

### Step 2: Run Backend
```bash
cd backend
python -m pip install -r requirements.txt
python -m alembic upgrade head  # Run migrations
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend API docs will be available at: **http://localhost:8000/docs**

---

## 2. Frontend Setup

### Step 1: Configure Frontend Environment
Create a `.env.local` file in the `ProEval_Frontend/` directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Optional: Add more as needed
NEXT_PUBLIC_APP_NAME=ProEval AI
```

### Step 2: Install Dependencies
```bash
cd ProEval_Frontend
npm install
```

### Step 3: Run Frontend
```bash
npm run dev
```

Frontend will be available at: **http://localhost:3000**

---

## 3. API Integration Architecture

### Backend API Endpoints

#### Authentication Routes (`/api/v1/auth`)
- **POST** `/register` - Initial student registration (sends OTP)
  ```json
  {
    "email": "student@university.edu",
    "name": "John Doe",
    "enrollment_no": "ENG001",
    "password": "securePassword123",
    "department": "Engineering",
    "programme": "B.Tech",
    "batch": "2023"
  }
  ```

- **POST** `/verify` - Verify OTP and create account
  ```json
  {
    "email": "student@university.edu",
    "otp": "123456"
  }
  ```
  Returns: `{ "access_token": "...", "token_type": "bearer" }`

- **POST** `/login` - Login (students & faculty)
  ```json
  {
    "email": "student@university.edu",
    "password": "securePassword123"
  }
  ```
  Returns: `{ "access_token": "...", "token_type": "bearer" }`

- **GET** `/me` - Get current user profile
  Returns: 
  ```json
  {
    "id": "uuid",
    "name": "John Doe",
    "email": "student@university.edu",
    "role": "STUDENT",
    "department": "Engineering",
    "enrollment_no": "ENG001",
    "programme": "B.Tech",
    "batch": "2023"
  }
  ```

#### Projects Routes (`/api/v1/projects`)
- **POST** `/` - Create new project (leader only)
  ```json
  {
    "title": "AI Chatbot",
    "description": "An intelligent chatbot system",
    "guide_id": "faculty-uuid" (optional)
  }
  ```

- **GET** `/{submission_id}` - Get project details
- **POST** `/{submission_id}/submit-phase-2` - Submit phase 2 deliverables
- **POST** `/join` - Join an existing project team

---

## 4. Frontend API Client Setup

### Step 1: Create API Client Utility
Create `src/lib/api.ts`:

```typescript
import { API_BASE_URL } from "@/constants";

interface ApiError {
  detail?: string;
  message?: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  status: number;
}

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
    localStorage.setItem("access_token", token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem("access_token");
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

    try {
      const response = await fetch(url, {
        ...options,
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
        throw new Error(
          data?.detail || data?.message || `HTTP ${response.status}`
        );
      }

      return { data, status: response.status };
    } catch (error) {
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
```

### Step 2: Create Auth Service
Create `src/lib/auth-service.ts`:

```typescript
import { apiClient } from "./api";

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  name: string;
  enrollment_no: string;
  password: string;
  department: string;
  programme: string;
  batch: string;
}

interface VerifyOTPRequest {
  email: string;
  otp: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "FACULTY" | "ADMIN";
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
    const { data } = await apiClient.post<{ message: string }>("/auth/register", payload);
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
```

### Step 3: Update Constants
Update `src/constants/index.ts`:

```typescript
export const APP_NAME = "ProEval AI";

// Ensure this matches your backend URL
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const PROJECT_STATUS = {
  PENDING: "pending",
  PHASE1_COMPLETE: "phase1_complete",
  PHASE2_ACTIVE: "phase2_active",
  COMPLETED: "completed",
} as const;

export const ROLES = {
  STUDENT: "STUDENT",
  FACULTY: "FACULTY",
  ADMIN: "ADMIN",
} as const;
```

---

## 5. Authentication Flow Implementation

### Step 1: Create a Context for Auth State
Create `src/context/AuthContext.tsx`:

```typescript
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authService } from "@/lib/auth-service";

interface User {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "FACULTY" | "ADMIN";
  department?: string;
  enrollment_no?: string;
  programme?: string;
  batch?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Restore user session on mount
  useEffect(() => {
    const restoreSession = async () => {
      if (authService.isAuthenticated()) {
        try {
          const userData = await authService.getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Failed to restore session:", error);
          authService.logout();
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await authService.login({ email, password });
      const userData = await authService.getCurrentUser();
      setUser(userData);
      setIsAuthenticated(true);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: any) => {
    setLoading(true);
    try {
      await authService.register(data);
      // User still needs to verify OTP
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    setLoading(true);
    try {
      await authService.verifyOTP({ email, otp });
      const userData = await authService.getCurrentUser();
      setUser(userData);
      setIsAuthenticated(true);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        register,
        verifyOTP,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
```

### Step 2: Wrap App with Provider
Update `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProEval AI",
  description: "Project evaluation platform with AI insights",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

---

## 6. Example: Login Page Implementation

Update `src/app/(auth)/login/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data.email, data.password);
      router.push("/student/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to ProEval AI</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                {...register("email")}
                type="email"
                placeholder="your@university.edu"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Password</label>
              <Input
                {...register("password")}
                type="password"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 7. Deployment Checklist

### Backend
- [ ] Set `DEBUG=False` in production
- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Update `DATABASE_URL` to production database
- [ ] Update `BACKEND_CORS_ORIGINS` to production frontend URL
- [ ] Set `ANTHROPIC_API_KEY` for production
- [ ] Use a production ASGI server (Gunicorn + Uvicorn)

### Frontend
- [ ] Update `NEXT_PUBLIC_API_URL` to production backend URL
- [ ] Build: `npm run build`
- [ ] Test: `npm start`
- [ ] Deploy to Vercel/AWS/your preferred platform

---

## 8. Troubleshooting

### CORS Errors
**Problem:** "Access to XMLHttpRequest blocked by CORS policy"
- **Solution:** Verify `BACKEND_CORS_ORIGINS` in backend `.env` includes your frontend URL

### 401 Unauthorized Errors
**Problem:** "Invalid token" or authentication errors
- **Solution:** Clear `localStorage` and login again. Check JWT_SECRET consistency.

### Network Connection Refused
**Problem:** "Cannot reach backend"
- **Solution:** 
  - Ensure backend is running: `uvicorn app.main:app --reload`
  - Check `NEXT_PUBLIC_API_URL` is correct
  - Verify both services are on correct ports (8000, 3000)

---

## 9. Next Steps

1. **Implement Protected Routes** - Prevent unauthenticated access
2. **Create Student Dashboard** - Display projects and status
3. **Implement Project Submission** - Phase 1 & Phase 2 flows
4. **Add Error Boundaries** - Better error handling in frontend
5. **API Documentation** - Generate OpenAPI client from backend
6. **Testing** - Write end-to-end tests for critical flows

