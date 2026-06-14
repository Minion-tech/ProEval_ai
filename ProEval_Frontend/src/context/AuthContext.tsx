"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authService, RegisterRequest } from "@/lib/auth-service";
export interface User {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "ADMIN";
}

  department?: string;
  enrollment_no?: string;
  programme?: string;
  batch?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterRequest) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore user session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const isDev = process.env.NODE_ENV === "development";
      
      if (authService.isAuthenticated()) {
        try {
          const userData = await authService.getCurrentUser();
          if (typeof window !== "undefined") {
            localStorage.setItem("current_user_email", userData.email);
          }
          setUser(userData);
          setIsAuthenticated(true);
          setError(null);
        } catch (err) {
          const isNetworkError =
            err instanceof Error &&
            ((err as Error & { code?: string }).code === "NETWORK_ERROR" ||
              err.message.toLowerCase().includes("failed to fetch"));

          if (isNetworkError) {
            // In dev mode, if we can't reach the backend, we might still want to show the UI
            if (isDev) {
               setUser({
                 id: "dev-admin",
                 name: "Project Coordinator (Guest)",
                 email: "admin@proeval.ai",
                 role: "ADMIN",
                 department: "Computer Science"
               });
               setIsAuthenticated(true);
            } else {
              setUser(null);
              setIsAuthenticated(false);
            }
            setError(null);
          } else {
            authService.logout();
            setUser(null);
            setIsAuthenticated(false);
            setError(err instanceof Error ? err.message : "Session restore failed");
          }
        }
      } else if (isDev) {
        // Auto-login as guest admin in dev mode if not authenticated
        setUser({
          id: "dev-admin",
          name: "Project Coordinator (Guest)",
          email: "admin@proeval.ai",
          role: "ADMIN",
          department: "Computer Science"
        });
        setIsAuthenticated(true);
      }
      setLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      await authService.login({ email, password });
      const userData = await authService.getCurrentUser();
      if (typeof window !== "undefined") {
        localStorage.setItem("current_user_email", userData.email);
      }
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    setLoading(true);
    setError(null);
    try {
      await authService.register(data);
      // User still needs to verify OTP
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    setLoading(true);
    setError(null);
    try {
      await authService.verifyOTP({ email, otp });
      const userData = await authService.getCurrentUser();
      if (typeof window !== "undefined") {
        localStorage.setItem("current_user_email", userData.email);
      }
      setUser(userData);
      setIsAuthenticated(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "OTP verification failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    if (typeof window !== "undefined") {
      localStorage.removeItem("current_user_email");
    }
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        error,
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
