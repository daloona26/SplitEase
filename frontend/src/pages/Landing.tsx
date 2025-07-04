import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  ArrowRight,
  Users,
  DollarSign,
  CheckCircle,
  Star,
  Zap,
  Shield,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Landing() {
  const { user } = useAuth();

  const getStartedLink = user ? "/dashboard" : "/signup";
  const getStartedText = user ? "Go to Dashboard" : "Get Started";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 font-sans antialiased transition-colors duration-300">
      <Navbar />

      {/* Hero Section */}
      <div
        className="
        max-w-xxs mx-auto px-3 pt-10 pb-8
        xs:max-w-sm xs:px-4 xs:pt-12 xs:pb-10
        sm:max-w-md sm:px-6 sm:pt-16 sm:pb-12
        md:max-w-4xl md:px-8 md:pt-20 md:pb-16
        lg:max-w-5xl lg:px-10 lg:pt-24 lg:pb-20
        xl:max-w-6xl xl:px-12 xl:pt-28 xl:pb-24
        2xl:max-w-7xl 2xl:px-14 2xl:pt-32 2xl:pb-28
        3xl:max-w-full 3xl:px-20 3xl:pt-36 3xl:pb-32
        4xl:px-32 4xl:pt-40 4xl:pb-36
        5xl:px-48 5xl:pt-48 5xl:pb-40
      "
      >
        <div className="text-center max-w-xl md:max-w-4xl mx-auto">
          {/* Tagline */}
          <div
            className="inline-flex items-center
            px-3 py-1.5 xs:px-4 xs:py-2
            bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-full
            text-blue-700 dark:text-blue-300 text-xs xs:text-sm font-medium mb-6 md:mb-8
            backdrop-blur-sm shadow-lg
            animate-pulse
          "
          >
            <Sparkles className="h-3 w-3 xs:h-4 xs:w-4 mr-1.5 xs:mr-2 text-yellow-500" />
            Trusted by thousands worldwide
          </div>

          {/* Main Heading */}
          <h1
            className="
            text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl 3xl:text-9xl
            font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent
            mb-6 md:mb-8 leading-tight
            animate-fade-in
          "
          >
            Split Expenses
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent relative">
              Effortlessly
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 dark:from-blue-400/20 dark:to-indigo-400/20 blur-lg -z-10 animate-pulse"></div>
            </span>
          </h1>

          {/* Sub-heading / Description */}
          <p
            className="
            text-base xs:text-lg md:text-xl lg:text-2xl
            text-slate-600 dark:text-slate-300 mb-4 md:mb-6 leading-relaxed font-light
          "
          >
            Perfect for roommates sharing rent and utilities, couples managing
            joint expenses, or travelers splitting costs on group trips.
          </p>

          {/* Secondary Description */}
          <p
            className="
            text-sm xs:text-base md:text-lg
            text-slate-500 dark:text-slate-400 mb-8 md:mb-12 leading-relaxed
          "
          >
            Track shared expenses, settle debts, and keep your finances
            organized with friends and family.
          </p>

          {/* Call to Action Buttons */}
          <div className="flex flex-col xs:flex-row justify-center gap-3 xs:gap-4 mb-12 md:mb-16">
            <Link
              to={getStartedLink}
              className="group
                bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white
                px-6 py-3 xs:px-8 xs:py-4 rounded-xl xs:rounded-2xl
                text-base xs:text-lg font-semibold shadow-xl hover:shadow-2xl dark:shadow-blue-900/30
                transform hover:-translate-y-1 transition-all duration-300
                flex items-center justify-center space-x-2
                hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-400 dark:hover:to-indigo-400
              "
            >
              <span>{getStartedText}</span>
              <ArrowRight className="h-4 w-4 xs:h-5 xs:w-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <Link
              to="/pricing"
              className="
                bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-700 dark:text-slate-200
                px-6 py-3 xs:px-8 xs:py-4 rounded-xl xs:rounded-2xl
                text-base xs:text-lg font-semibold
                border-2 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500
                shadow-lg hover:shadow-xl dark:shadow-slate-900/30 transform hover:-translate-y-1 transition-all duration-300
              "
            >
              View Pricing
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-y-8 xs:gap-y-0 gap-x-4 sm:gap-8 mb-16 md:mb-20">
            <div className="text-center transform hover:scale-105 transition-transform duration-300">
              <div className="text-2xl xs:text-3xl font-bold text-slate-800 dark:text-slate-200">
                50k+
              </div>
              <div className="text-sm xs:text-base text-slate-600 dark:text-slate-400">
                Active Users
              </div>
            </div>
            <div className="text-center transform hover:scale-105 transition-transform duration-300">
              <div className="text-2xl xs:text-3xl font-bold text-slate-800 dark:text-slate-200">
                $10M+
              </div>
              <div className="text-sm xs:text-base text-slate-600 dark:text-slate-400">
                Expenses Tracked
              </div>
            </div>
            <div className="text-center transform hover:scale-105 transition-transform duration-300">
              <div className="text-2xl xs:text-3xl font-bold text-slate-800 dark:text-slate-200">
                99.9%
              </div>
              <div className="text-sm xs:text-base text-slate-600 dark:text-slate-400">
                Uptime
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-2xl md:max-w-6xl mx-auto">
          {/* Feature 1 */}
          <div className="group bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-6 xs:p-8 rounded-2xl xs:rounded-3xl shadow-xl dark:shadow-slate-900/30 border border-white/20 dark:border-slate-700/50 hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300">
            <div
              className="
              w-14 h-14 xs:w-16 xs:h-16
              bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500
              rounded-xl xs:rounded-2xl flex items-center justify-center
              mb-4 xs:mb-6 group-hover:scale-110 transition-transform duration-300
              shadow-lg
            "
            >
              <Users className="h-7 w-7 xs:h-8 xs:w-8 text-white" />
            </div>
            <h3 className="text-xl xs:text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3 xs:mb-4">
              Create Groups
            </h3>
            <p className="text-sm xs:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Organize expenses by creating groups for trips, households, or any
              shared activities with intelligent categorization.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-6 xs:p-8 rounded-2xl xs:rounded-3xl shadow-xl dark:shadow-slate-900/30 border border-white/20 dark:border-slate-700/50 hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300">
            <div
              className="
              w-14 h-14 xs:w-16 xs:h-16
              bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500
              rounded-xl xs:rounded-2xl flex items-center justify-center
              mb-4 xs:mb-6 group-hover:scale-110 transition-transform duration-300
              shadow-lg
            "
            >
              <DollarSign className="h-7 w-7 xs:h-8 xs:w-8 text-white" />
            </div>
            <h3 className="text-xl xs:text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3 xs:mb-4">
              Track Expenses
            </h3>
            <p className="text-sm xs:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Easily log expenses and automatically calculate who owes what to
              whom with smart debt optimization algorithms.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-6 xs:p-8 rounded-2xl xs:rounded-3xl shadow-xl dark:shadow-slate-900/30 border border-white/20 dark:border-slate-700/50 hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300">
            <div
              className="
              w-14 h-14 xs:w-16 xs:h-16
              bg-gradient-to-br from-purple-500 to-pink-600 dark:from-purple-400 dark:to-pink-500
              rounded-xl xs:rounded-2xl flex items-center justify-center
              mb-4 xs:mb-6 group-hover:scale-110 transition-transform duration-300
              shadow-lg
            "
            >
              <CheckCircle className="h-7 w-7 xs:h-8 xs:w-8 text-white" />
            </div>
            <h3 className="text-xl xs:text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3 xs:mb-4">
              Settle Up
            </h3>
            <p className="text-sm xs:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Get clear settlement suggestions to minimize the number of
              transactions needed with optimal payment routing.
            </p>
          </div>
        </div>

        {/* Additional Features */}
        <div className="mt-16 md:mt-24 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-xl md:max-w-4xl mx-auto">
          <div
            className="flex items-center space-x-2 xs:space-x-3
            bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-xl xs:rounded-2xl p-3 xs:p-4
            border border-white/20 dark:border-slate-700/50 hover:shadow-lg transition-all duration-300
            transform hover:scale-105
          "
          >
            <Zap className="h-5 w-5 xs:h-6 xs:w-6 text-yellow-500" />
            <span className="text-sm xs:text-base text-slate-700 dark:text-slate-300 font-medium">
              Lightning Fast
            </span>
          </div>
          <div
            className="flex items-center space-x-2 xs:space-x-3
            bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-xl xs:rounded-2xl p-3 xs:p-4
            border border-white/20 dark:border-slate-700/50 hover:shadow-lg transition-all duration-300
            transform hover:scale-105
          "
          >
            <Shield className="h-5 w-5 xs:h-6 xs:w-6 text-green-500" />
            <span className="text-sm xs:text-base text-slate-700 dark:text-slate-300 font-medium">
              Bank-Grade Security
            </span>
          </div>
          <div
            className="flex items-center space-x-2 xs:space-x-3
            bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-xl xs:rounded-2xl p-3 xs:p-4
            border border-white/20 dark:border-slate-700/50 hover:shadow-lg transition-all duration-300
            transform hover:scale-105
          "
          >
            <Users className="h-5 w-5 xs:h-6 xs:w-6 text-blue-500" />
            <span className="text-sm xs:text-base text-slate-700 dark:text-slate-300 font-medium">
              Team Collaboration
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
