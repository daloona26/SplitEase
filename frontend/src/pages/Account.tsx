import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import {
  User,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Star,
  Shield,
} from "lucide-react";

export default function Account() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [error, setError] = useState("");

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingUpdate(true);
    setUpdateMessage("");
    setError("");

    if (!name.trim() || !email.trim()) {
      setError("Name and email cannot be empty.");
      setLoadingUpdate(false);
      return;
    }

    // Simulate API call
    setTimeout(() => {
      setUpdateMessage("Profile updated successfully!");
      setLoadingUpdate(false);
    }, 1000);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 transition-colors duration-300">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-12 text-center">
          Account Settings
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-slate-700/50">
              <div className="flex items-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <User className="h-10 w-10 text-white" />
                </div>
                <div className="ml-6">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    {user.name}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 text-lg">
                    {user.email}
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                {updateMessage && (
                  <div className="bg-green-50/90 dark:bg-green-950/50 backdrop-blur-sm border-2 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-6 py-4 rounded-2xl flex items-center shadow-lg">
                    <CheckCircle className="h-5 w-5 mr-3" />
                    <span className="font-medium">{updateMessage}</span>
                  </div>
                )}
                {error && (
                  <div className="bg-red-50/90 dark:bg-red-950/50 backdrop-blur-sm border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-6 py-4 rounded-2xl flex items-center shadow-lg">
                    <XCircle className="h-5 w-5 mr-3" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3"
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-slate-800 dark:text-slate-200 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm transition-all duration-200"
                    disabled={loadingUpdate}
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-slate-800 dark:text-slate-200 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm transition-all duration-200"
                    disabled={loadingUpdate}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingUpdate}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white px-6 py-4 rounded-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 transform hover:-translate-y-0.5 font-semibold text-lg"
                >
                  {loadingUpdate && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  )}
                  {loadingUpdate ? "Updating..." : "Update Profile"}
                </button>
              </form>
            </div>
          </div>

          {/* Subscription Status Card */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-slate-700/50">
              <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-6">
                Subscription Status
              </h3>

              <div className="space-y-6">
                {/* Current Status */}
                <div
                  className={`p-6 rounded-2xl border-2 ${
                    user.isSubscribed
                      ? "bg-green-50/90 dark:bg-green-950/50 border-green-200 dark:border-green-800"
                      : "bg-amber-50/90 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800"
                  } backdrop-blur-sm`}
                >
                  <div className="flex items-center mb-3">
                    {user.isSubscribed ? (
                      <Star className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" />
                    ) : (
                      <Star className="h-6 w-6 text-amber-600 dark:text-amber-400 mr-3" />
                    )}
                    <span
                      className={`font-bold text-lg ${
                        user.isSubscribed
                          ? "text-green-700 dark:text-green-300"
                          : "text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {user.isSubscribed ? "Pro Member" : "Free Trial"}
                    </span>
                  </div>

                  {user.isSubscribed ? (
                    <p className="text-green-600 dark:text-green-400 text-sm font-medium">
                      You have access to all premium features
                    </p>
                  ) : (
                    <div>
                      {user.isTrialActive &&
                        user.trialEndsAt &&
                        new Date(user.trialEndsAt) > new Date() && (
                          <p className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                            Trial ends on:{" "}
                            {new Date(user.trialEndsAt).toLocaleDateString(
                              "en-US"
                            )}
                          </p>
                        )}
                      {user.isTrialActive &&
                        user.trialEndsAt &&
                        new Date(user.trialEndsAt) <= new Date() && (
                          <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                            Trial expired on:{" "}
                            {new Date(user.trialEndsAt).toLocaleDateString(
                              "en-US"
                            )}
                          </p>
                        )}
                    </div>
                  )}
                </div>

                {/* Features List */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wide">
                    Your Features
                  </h4>
                  {[
                    "Unlimited Groups",
                    "Expense Tracking",
                    "Balance Calculations",
                    "Member Management",
                    "Secure Data Storage",
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 mr-3" />
                      <span className="text-slate-600 dark:text-slate-400 text-sm">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Security Badge */}
                <div className="p-4 bg-slate-50/90 dark:bg-slate-700/50 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-slate-600 dark:text-slate-400 mr-3" />
                    <div>
                      <p className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                        Secure Account
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">
                        Bank-grade encryption
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 text-center">
            <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {Math.floor(
                (Date.now() -
                  new Date(user.created_at || Date.now()).getTime()) /
                  (1000 * 60 * 60 * 24)
              )}
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
              Days with SplitEase
            </p>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 text-center">
            <User className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-3" />
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              Active
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
              Account Status
            </p>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 text-center">
            <Mail className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-3" />
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              Verified
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
              Email Status
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
