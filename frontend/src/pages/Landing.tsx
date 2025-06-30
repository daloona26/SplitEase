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
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Landing() {
  const { user } = useAuth();

  const getStartedLink = user ? "/dashboard" : "/signup";
  const getStartedText = user ? "Go to Dashboard" : "Get Started";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-sm font-medium mb-8">
            <Star className="h-4 w-4 mr-2 text-yellow-500" />
            Trusted by thousands of users
          </div>

          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-8 leading-tight">
            Split Expenses
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Effortlessly
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-600 mb-6 leading-relaxed font-light">
            Perfect for roommates sharing rent and utilities, couples managing
            joint expenses, or travelers splitting costs on group trips.
          </p>

          <p className="text-lg text-slate-500 mb-12 leading-relaxed">
            Track shared expenses, settle debts, and keep your finances
            organized with friends and family.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
            <Link
              to={getStartedLink}
              className="group bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <span>{getStartedText}</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <Link
              to="/pricing"
              className="bg-white/80 backdrop-blur-sm text-slate-700 px-8 py-4 rounded-2xl text-lg font-semibold border-2 border-slate-200 hover:border-slate-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              View Pricing
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-20">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-800">10k+</div>
              <div className="text-slate-600">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-800">$2M+</div>
              <div className="text-slate-600">Expenses Tracked</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-800">99.9%</div>
              <div className="text-slate-600">Uptime</div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="group bg-white/60 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-4">
              Create Groups
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Organize expenses by creating groups for trips, households, or any
              shared activities with intelligent categorization.
            </p>
          </div>

          <div className="group bg-white/60 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-4">
              Track Expenses
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Easily log expenses and automatically calculate who owes what to
              whom with smart debt optimization algorithms.
            </p>
          </div>

          <div className="group bg-white/60 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-4">
              Settle Up
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Get clear settlement suggestions to minimize the number of
              transactions needed with optimal payment routing.
            </p>
          </div>
        </div>

        {/* Additional Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <Zap className="h-6 w-6 text-yellow-500" />
            <span className="text-slate-700 font-medium">Lightning Fast</span>
          </div>
          <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <Shield className="h-6 w-6 text-green-500" />
            <span className="text-slate-700 font-medium">
              Bank-Grade Security
            </span>
          </div>
          <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <Users className="h-6 w-6 text-blue-500" />
            <span className="text-slate-700 font-medium">
              Team Collaboration
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
