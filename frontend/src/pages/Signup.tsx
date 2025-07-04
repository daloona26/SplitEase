import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Eye,
  EyeOff,
  DollarSign,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      const result = await signup(name, email, password);
      if (result.success) {
        navigate("/pricing");
      } else {
        setError(result.message || "Failed to create account.");
      }
    } catch (err: any) {
      console.error("Signup failed:", err);
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 flex flex-col justify-center
      py-8 xs:py-10 sm:py-12 px-4 xs:px-6 sm:px-8 lg:px-10 transition-colors duration-300
    "
    >
      <div className="mx-auto w-full max-w-xs xs:max-w-sm sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-4 xs:mb-6">
          <div
            className="w-14 h-14 xs:w-16 xs:h-16
            bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 rounded-xl xs:rounded-2xl
            flex items-center justify-center shadow-xl dark:shadow-blue-900/30
            animate-pulse
          "
          >
            <DollarSign className="h-7 w-7 xs:h-8 xs:w-8 text-white" />
          </div>
        </div>
        {/* Title */}
        <h2
          className="mt-4 xs:mt-6 text-center
          text-3xl xs:text-4xl font-bold
          bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent
        "
        >
          Join SplitEase
        </h2>
        {/* Subtitle */}
        <p className="mt-1.5 xs:mt-2 text-center text-sm xs:text-base text-slate-600 dark:text-slate-400">
          Create your account and start splitting expenses
        </p>
      </div>

      <div className="mt-6 xs:mt-8 mx-auto w-full max-w-xs xs:max-w-sm sm:max-w-md">
        <div
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm
          py-6 px-4 xs:py-8 xs:px-6
          shadow-2xl dark:shadow-slate-900/50 rounded-2xl xs:rounded-3xl border border-white/20 dark:border-slate-700/50
          transition-all duration-300
        "
        >
          <form className="space-y-4 xs:space-y-6" onSubmit={handleSubmit}>
            {/* Error Message */}
            {error && (
              <div
                className="bg-red-50 dark:bg-red-950/50 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300
                px-3 py-2 xs:px-4 xs:py-3 rounded-lg xs:rounded-2xl text-sm flex items-center
              "
              >
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Name Input */}
            <div>
              <label
                htmlFor="name"
                className="block text-xs xs:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 xs:mb-2"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="block w-full px-3 py-2 xs:px-4 xs:py-3
                  border-2 border-slate-200 dark:border-slate-600 rounded-lg xs:rounded-xl shadow-sm
                  placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                  transition-all duration-200 bg-white/50 dark:bg-slate-700/50 text-sm xs:text-base
                  text-slate-900 dark:text-slate-100
                "
                placeholder="Enter your full name"
              />
            </div>

            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs xs:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 xs:mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full px-3 py-2 xs:px-4 xs:py-3
                  border-2 border-slate-200 dark:border-slate-600 rounded-lg xs:rounded-xl shadow-sm
                  placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                  transition-all duration-200 bg-white/50 dark:bg-slate-700/50 text-sm xs:text-base
                  text-slate-900 dark:text-slate-100
                "
                placeholder="Enter your email"
              />
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs xs:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 xs:mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full px-3 py-2 pr-10 xs:px-4 xs:py-3 xs:pr-12
                    border-2 border-slate-200 dark:border-slate-600 rounded-lg xs:rounded-xl shadow-sm
                    placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                    transition-all duration-200 bg-white/50 dark:bg-slate-700/50 text-sm xs:text-base
                    text-slate-900 dark:text-slate-100
                  "
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 xs:pr-4 flex items-center
                    text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-200
                  "
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 xs:h-5 xs:w-5" />
                  ) : (
                    <Eye className="h-4 w-4 xs:h-5 xs:w-5" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xxs xs:text-sm text-slate-500 dark:text-slate-400">
                Must be at least 6 characters
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center
                py-2.5 px-3 xs:py-3 xs:px-4
                border border-transparent rounded-lg xs:rounded-xl shadow-lg dark:shadow-blue-900/30
                text-white bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500
                hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-400 dark:hover:to-indigo-400 focus:outline-none
                focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400
                disabled:opacity-50 transition-all duration-200 transform hover:-translate-y-0.5
                font-semibold text-sm xs:text-base
              "
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 xs:h-5 xs:w-5 border-b-2 border-white mr-2"></div>
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 xs:mt-8">
            <div className="text-center text-sm xs:text-base">
              <span className="text-slate-600 dark:text-slate-400">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors duration-200"
                >
                  Sign in
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
