import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { DollarSign, LogOut, User, Users, Tag } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              SplitEase
            </span>
          </Link>

          <div className="flex items-center space-x-2">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-2 px-4 py-2 text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 font-medium"
                >
                  <Users className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>

                {!user.isSubscribed && (
                  <Link
                    to="/pricing"
                    className="flex items-center space-x-2 px-4 py-2 text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 font-medium"
                  >
                    <Tag className="h-4 w-4" />
                    <span>Pricing</span>
                  </Link>
                )}

                <Link
                  to="/account"
                  className="flex items-center space-x-2 px-4 py-2 text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 font-medium"
                >
                  <User className="h-4 w-4" />
                  <span>Account</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 text-slate-700 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 font-medium"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-slate-700 hover:text-blue-600 font-medium rounded-xl hover:bg-blue-50 transition-all duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
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
