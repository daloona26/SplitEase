// frontend/src/contexts/AuthContext.tsx

import type React from "react";
import {
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
  api: typeof axios; // Expose the configured axios instance
}

// Determine BACKEND_URL once when the module loads
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api";
console.log("AuthContext: BACKEND_URL for axios:", BACKEND_URL); // Debugging line

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
    console.log("API Interceptor: Response error detected.", error.response);

    if (error.response?.status === 401) {
      const errorMessage = error.response.data?.message?.toLowerCase() || "";

      // Only redirect to login for actual authentication errors (invalid/expired token)
      if (
        errorMessage.includes("token") ||
        errorMessage.includes("authentication") ||
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("invalid token") ||
        errorMessage.includes("expired") ||
        errorMessage.includes("jwt")
      ) {
        console.warn(
          "API Interceptor: Authentication error detected. Logging out user."
        );
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // Use window.location.href to ensure full page reload and clean state
        window.location.href = "/login";
      } else {
        console.warn(
          "API Interceptor: 401 error but not authentication related. Not logging out."
        );
      }
    } else if (error.response?.status === 403) {
      // 403 is authorization (permission) error, not authentication.
      // Do NOT redirect to login for 403, as the user is authenticated but lacks permission.
      console.warn(
        "API Interceptor: 403 Forbidden - Permission denied. Not logging out."
      );
    }

    return Promise.reject(error);
  }
);

const AuthContext = createContext<AuthContextType | undefined>(undefined); // Moved context definition here

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
      console.log("getUserFromToken: Decoded JWT payload:", payload);
      // Check for token expiry on client side, too
      const currentTime = Date.now() / 1000; // in seconds
      if (payload.exp && payload.exp < currentTime) {
        console.warn("getUserFromToken: Token expired on client side.");
        return null; // Token is expired
      }

      return {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        isSubscribed: payload.isSubscribed || false,
        isTrialActive: payload.isTrialActive || false,
        trialEndsAt: payload.trialEndsAt || null, // Already ISO string from backend
      };
    } catch (e) {
      console.error("getUserFromToken: Error decoding token:", e);
      return null;
    }
  }, []);

  // Helper to store token and user data
  const setAuthData = useCallback((token: string, userData: User) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    console.log("setAuthData: Token saved to localStorage");
    console.log("setAuthData: User state set to:", userData);
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  // Function to refresh user data from backend and get a new token
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("refreshUser: No token found. Setting user to null.");
      setUser(null);
      setIsAuthenticated(false);
      return;
    }

    console.log(
      "refreshUser: Attempting to fetch latest user data with token (via global api)."
    );
    try {
      // Use the globally defined 'api' instance directly here
      const response = await api.get("/auth/me");

      if (response.data && response.data.user && response.data.token) {
        const fetchedUser = response.data.user;
        const newToken = response.data.token;
        console.log(
          "refreshUser: New user data and token received. Updating auth data."
        );
        setAuthData(newToken, fetchedUser); // Update with new token
        console.log("refreshUser: User state updated successfully.");
      } else {
        console.error(
          "refreshUser: Invalid response from /auth/me - missing user data or token.",
          response.data
        );
        // If response is invalid, clear storage and set state to unauthenticated
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error: any) {
      console.error(
        "refreshUser: API call failed:",
        error.response?.data?.message || error.message
      );
      // Only clear local storage/state if it's truly an authentication error (401)
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setIsAuthenticated(false);
        // Let the interceptor handle the actual redirect to /login
      } else {
        // For other errors (e.g., network, 500), keep current user data if available
        // but log the issue. This prevents forced logout for temporary server issues.
        console.warn(
          "refreshUser: Non-401 error, keeping existing user state if any."
        );
        const localUser = localStorage.getItem("user");
        if (localUser) {
          try {
            setUser(JSON.parse(localUser));
            setIsAuthenticated(true);
          } catch (parseError) {
            console.error(
              "refreshUser: Could not parse local user data after non-401 error:",
              parseError
            );
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
      // Use the globally defined 'api' instance for login as well
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      if (response.data && response.data.token && response.data.user) {
        setAuthData(response.data.token, response.data.user);
        console.log("User logged in successfully:", response.data.user.name);
        return { success: true };
      } else {
        throw new Error("Invalid response from login endpoint");
      }
    } catch (error: any) {
      console.error("Login error:", error);
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
      // Use the globally defined 'api' instance for signup as well
      const response = await api.post("/auth/signup", {
        name,
        email,
        password,
      });

      if (response.data && response.data.token && response.data.user) {
        setAuthData(response.data.token, response.data.user);
        console.log("User registered successfully:", response.data.user.name);
        return { success: true };
      } else {
        throw new Error("Invalid response from signup endpoint");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
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
    console.log("logout: User logged out and token removed");
    window.location.href = "/login"; // Full redirect to login page
  }, []);

  // Initial load and token refresh logic
  useEffect(() => {
    const loadInitialUser = async () => {
      setLoading(true); // Ensure loading is true at the start
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");

      console.log(
        "AuthProvider useEffect: Checking localStorage for token. Found:",
        !!token,
        "User data:",
        !!userData
      );

      if (token) {
        // If a token exists, try to validate/refresh it from the backend
        await refreshUser(); // Wait for refreshUser to complete
      } else {
        // If no token, explicitly set unauthenticated state
        console.log(
          "AuthProvider useEffect: No token found. Setting user to null."
        );
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false); // Set loading to false only after all checks are done
    };

    loadInitialUser();
  }, [refreshUser]); // Dependencies for useEffect

  const value: AuthContextType = {
    user,
    isAuthenticated,
    loading,
    login,
    signup,
    logout,
    refreshUser,
    api, // Expose the configured axios instance
  };

  if (loading) {
    // Render a global loading indicator while authentication is being resolved
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-700 text-lg">Loading application...</p>
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
