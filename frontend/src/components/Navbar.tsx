import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { DollarSign, LogOut, User, Users, Tag, Moon, Sun } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-lg border-b border-white/20 dark:border-slate-700/50 sticky top-0 z-50 transition-all duration-300">
      {/* Main container with responsive padding and max-width */}
      <div
        className="
        max-w-xxs mx-auto px-2
        xs:max-w-sm xs:px-3
        sm:max-w-md sm:px-4
        md:max-w-2xl md:px-6
        lg:max-w-4xl lg:px-8
        xl:max-w-6xl xl:px-10
        2xl:max-w-7xl 2xl:px-12
        3xl:max-w-full 3xl:px-16
        4xl:px-24 5xl:px-32
      "
      >
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo Section */}
          <Link
            to="/"
            className="flex items-center space-x-2 xs:space-x-3 group flex-shrink-0"
          >
            <div
              className="
              w-8 h-8 xs:w-10 xs:h-10
              bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 rounded-lg xs:rounded-xl
              flex items-center justify-center shadow-lg
              group-hover:scale-110 transition-transform duration-300
            "
            >
              <DollarSign className="h-5 w-5 xs:h-6 xs:w-6 text-white" />
            </div>
            <span
              className="
              text-xl xs:text-2xl
              font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent
              whitespace-nowrap
            "
            >
              SplitEase
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center flex-wrap justify-end gap-x-1.5 xs:gap-x-2 gap-y-1">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 xs:p-2.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md xs:rounded-xl transition-all duration-200"
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4 xs:h-5 xs:w-5" />
              ) : (
                <Sun className="h-4 w-4 xs:h-5 xs:w-5" />
              )}
            </button>

            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-1.5 px-2 py-1 xs:px-4 xs:py-2
                             text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50
                             rounded-md xs:rounded-xl transition-all duration-200
                             font-medium text-xs xs:text-sm"
                >
                  <Users className="h-3 w-3 xs:h-4 xs:w-4" />
                  <span>Dashboard</span>
                </Link>

                {!user.isSubscribed && (
                  <Link
                    to="/pricing"
                    className="flex items-center space-x-1.5 px-2 py-1 xs:px-4 xs:py-2
                               text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50
                               rounded-md xs:rounded-xl transition-all duration-200
                               font-medium text-xs xs:text-sm"
                  >
                    <Tag className="h-3 w-3 xs:h-4 xs:w-4" />
                    <span>Pricing</span>
                  </Link>
                )}

                <Link
                  to="/account"
                  className="flex items-center space-x-1.5 px-2 py-1 xs:px-4 xs:py-2
                             text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50
                             rounded-md xs:rounded-xl transition-all duration-200
                             font-medium text-xs xs:text-sm"
                >
                  <User className="h-3 w-3 xs:h-4 xs:w-4" />
                  <span>Account</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1.5 px-2 py-1 xs:px-4 xs:py-2
                             text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50
                             rounded-md xs:rounded-xl transition-all duration-200
                             font-medium text-xs xs:text-sm"
                >
                  <LogOut className="h-3 w-3 xs:h-4 xs:w-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-1.5 xs:px-4 xs:py-2
                             text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium
                             rounded-md xs:rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all duration-200
                             text-xs xs:text-sm"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white
                             px-4 py-1.5 xs:px-6 xs:py-2
                             rounded-md xs:rounded-xl font-semibold
                             hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200
                             text-xs xs:text-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
