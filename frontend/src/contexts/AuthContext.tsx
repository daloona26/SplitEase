import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";

// Define the shape of our User object
interface User {
  id: string;
  name: string;
  email: string;
  isSubscribed?: boolean;
  isTrialActive?: boolean;
  trialEndsAt?: string | null;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  signup: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  api: typeof axios;
}

// Determine BACKEND_URL once when the module loads
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api";

// Global axios instance with interceptors
export const api = axios.create({
  baseURL: BACKEND_URL,
});

// Request Interceptor: Automatically attach JWT to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle authentication/authorization errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const errorMessage = error.response.data?.message?.toLowerCase() || "";

      // Only redirect to login for actual authentication errors
      if (
        errorMessage.includes("token") ||
        errorMessage.includes("authentication") ||
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("invalid token") ||
        errorMessage.includes("expired") ||
        errorMessage.includes("jwt")
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Function to get user data from a stored JWT token
  const getUserFromToken = useCallback((token: string): User | null => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Date.now() / 1000;
      if (payload.exp && payload.exp < currentTime) {
        return null; // Token is expired
      }

      return {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        isSubscribed: payload.isSubscribed || false,
        isTrialActive: payload.isTrialActive || false,
        trialEndsAt: payload.trialEndsAt || null,
        created_at: payload.created_at || new Date().toISOString(),
      };
    } catch (e) {
      return null;
    }
  }, []);

  // Helper to store token and user data
  const setAuthData = useCallback((token: string, userData: User) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  // Function to refresh user data from backend
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      return;
    }

    try {
      const response = await api.get("/auth/me");

      if (response.data && response.data.user && response.data.token) {
        const fetchedUser = response.data.user;
        const newToken = response.data.token;
        setAuthData(newToken, fetchedUser);
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setIsAuthenticated(false);
      } else {
        // For other errors, keep existing user data if available
        const localUser = localStorage.getItem("user");
        if (localUser) {
          try {
            setUser(JSON.parse(localUser));
            setIsAuthenticated(true);
          } catch (parseError) {
            localStorage.removeItem("user");
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      }
    }
  }, [setAuthData]);

  // Login handler
  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      if (response.data && response.data.token && response.data.user) {
        setAuthData(response.data.token, response.data.user);
        return { success: true };
      } else {
        throw new Error("Invalid response from login endpoint");
      }
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Login failed. Please try again.",
      };
    }
  };

  // Signup handler
  const signup = async (
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.post("/auth/signup", {
        name,
        email,
        password,
      });

      if (response.data && response.data.token && response.data.user) {
        setAuthData(response.data.token, response.data.user);
        return { success: true };
      } else {
        throw new Error("Invalid response from signup endpoint");
      }
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Registration failed. Please try again.",
      };
    }
  };

  // Logout handler
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = "/login";
  }, []);

  // Initial load and token refresh logic
  useEffect(() => {
    const loadInitialUser = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (token) {
        await refreshUser();
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    loadInitialUser();
  }, [refreshUser]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    loading,
    login,
    signup,
    logout,
    refreshUser,
    api,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400 mb-4"></div>
          <p className="text-slate-700 dark:text-slate-300 text-lg">
            Loading application...
          </p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
