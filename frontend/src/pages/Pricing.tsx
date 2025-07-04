import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, api } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import { CheckCircle } from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export default function Pricing() {
  const { user, refreshUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">(
    "monthly"
  );

  const isPageLoading = authLoading || loading;

  // IMPORTANT: Get PayPal Client ID and Plan IDs from frontend environment variables
  // In a real application, these would be securely loaded from environment variables.
  // For demonstration purposes, placeholders are used.
  const PAYPAL_CLIENT_ID =
    import.meta.env.VITE_PAYPAL_CLIENT_ID ||
    "YOUR_PAYPAL_CLIENT_ID_FROM_ENV_FALLBACK";
  const PAYPAL_MONTHLY_PLAN_ID =
    import.meta.env.VITE_PAYPAL_MONTHLY_PLAN_ID ||
    "YOUR_MONTHLY_PAYPAL_PLAN_ID_FROM_ENV_FALLBACK";
  const PAYPAL_YEARLY_PLAN_ID =
    import.meta.env.VITE_PAYPAL_YEARLY_PLAN_ID ||
    "YOUR_YEARLY_PAYPAL_PLAN_ID_FROM_ENV_FALLBACK";

  // PayPal SDK options for PayPalScriptProvider
  // 'vault=true' is crucial for subscriptions to allow recurring payments
  // 'intent=subscription' explicitly tells the SDK this is for subscriptions
  const paypalScriptOptions = {
    clientId: PAYPAL_CLIENT_ID,
    currency: "USD",
    vault: true, // Required for subscriptions
    intent: "subscription", // Required for subscriptions
    // For LIVE deployment: REMOVE the 'environment' line.
    // The SDK will automatically use the live environment if a live clientId is provided.
    // environment: "sandbox", // <-- THIS LINE IS REMOVED FOR LIVE DEPLOYMENT in production
  };

  // Redirect logic, now dependent on authLoading to ensure user state is resolved
  useEffect(() => {
    if (!authLoading) {
      // If user is NOT logged in, redirect to login
      if (!user) {
        navigate("/login");
        return;
      }
      // If user IS subscribed, redirect to dashboard (they don't need pricing)
      if (user.isSubscribed) {
        navigate("/dashboard");
        return; // Important to return after navigate
      }
      // If user is NOT subscribed but IS on an active trial,
      // they are allowed to stay on the pricing page. No redirect here.
      // If user is NOT subscribed and their trial has EXPIRED,
      // they are also allowed to stay on the pricing page to subscribe. No redirect here.
    }
  }, [user, navigate, authLoading]); // Add authLoading to dependencies

  // This function is called by the PayPalButtons SDK when the subscription is approved on PayPal's site.
  const onApprove = async (data: any, actions: any) => {
    setLoading(true);
    setError("");
    try {
      // In a real app, you would likely verify the subscription with your backend here
      // using data.subscriptionID. For this example, we just refresh the user.
      await refreshUser(); // Fetch latest user status from backend
      navigate("/dashboard?payment_status=success"); // Redirect to dashboard with success param
    } catch (error) {
      console.error("PayPal subscription approval error:", error);
      setError(
        "Subscription approved but failed to confirm status. Please check your account."
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle errors from the PayPal button
  const onError = (err: any) => {
    console.error("PayPal button error:", err);
    // Display a more user-friendly error if it's the "not configured" one
    if (
      err.message &&
      err.message.includes("PayPal Plan ID is not configured.")
    ) {
      setError(
        err.message +
          " Please ensure your .env file is correctly set up and your frontend server has been restarted."
      );
    } else if (err.message && err.message.includes("Detected popup close")) {
      setError("PayPal window was closed or interrupted. Please try again.");
    } else {
      setError("PayPal button encountered an error. Please try again.");
    }
    setLoading(false);
  };

  // New function to start a free trial (without PayPal)
  const startFreeTrial = async () => {
    setError("");
    setLoading(true);
    try {
      // Simulate API call to backend to start trial
      // In a real app, this would be an actual API call, e.g.:
      const response = await api.post("/auth/start-trial");
      if (response.data && response.data.user && response.data.token) {
        await refreshUser(); // Fetch latest user status from backend
        navigate("/dashboard?trial_status=activated");
      } else {
        throw new Error("Failed to activate free trial.");
      }
    } catch (err: any) {
      console.error("Error starting free trial:", err);
      setError(
        err.response?.data?.message ||
          "Failed to start free trial. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Show a full-page loading spinner if authentication is still loading
  // or if a PayPal action is in progress.
  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400 mb-4"></div>
          <p className="text-slate-700 dark:text-slate-300 text-lg">
            Loading pricing info...
          </p>
        </div>
      </div>
    );
  }

  // If user is already subscribed (after loading is done), show nothing (redirect handled by useEffect)
  // If user is on an active trial, they are allowed to see this page, so we don't return null here.
  if (user?.isSubscribed) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 font-sans antialiased transition-colors duration-300">
      <Navbar />

      <div
        className="
        max-w-xxs mx-auto px-3 py-10
        xs:max-w-sm xs:px-4 xs:py-12
        sm:max-w-md sm:px-6 sm:py-16
        md:max-w-xl md:px-8 md:py-20
        lg:max-w-4xl lg:px-10 lg:py-24
        xl:max-w-5xl xl:px-12 xl:py-28
        2xl:max-w-6xl 2xl:px-14 2xl:py-32
        3xl:max-w-full 3xl:px-20 3xl:py-36
        4xl:px-32 4xl:py-40
        5xl:px-48 5xl:py-48
      "
      >
        <div className="text-center mb-8 xs:mb-12">
          <h1
            className="
            text-3xl xs:text-4xl sm:text-5xl font-bold
            bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent
            mb-3 xs:mb-4
          "
          >
            Simple, Transparent Pricing
          </h1>
          <p className="text-base xs:text-xl text-slate-600 dark:text-slate-400">
            Perfect for roommates, couples, and travelers splitting costs
          </p>
        </div>

        <div className="flex justify-center mb-6 xs:mb-8">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex shadow-inner">
            <button
              onClick={() => setSelectedPlan("monthly")}
              className={`px-4 py-2 xs:px-6 xs:py-2.5 rounded-md font-medium text-sm xs:text-base transition-all duration-200 ${
                selectedPlan === "monthly"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
              disabled={isPageLoading}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedPlan("yearly")}
              className={`px-4 py-2 xs:px-6 xs:py-2.5 rounded-md font-medium text-sm xs:text-base transition-all duration-200 ${
                selectedPlan === "yearly"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
              disabled={isPageLoading}
            >
              Yearly
            </button>
          </div>
        </div>

        {error && (
          <div
            className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300
            px-3 py-2 xs:px-4 xs:py-3 rounded-lg xs:rounded-xl mb-4 max-w-xs xs:max-w-md mx-auto text-sm
          "
          >
            {error}
          </div>
        )}

        <div className="max-w-xs xs:max-w-md mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 xs:p-8 border-2 border-blue-200 dark:border-blue-800">
            <div className="text-center mb-6 xs:mb-8">
              <h3 className="text-xl xs:text-2xl font-bold text-slate-900 dark:text-slate-100">
                SplitEase Pro
              </h3>
              <div className="mt-3 xs:mt-4">
                <span className="text-4xl xs:text-5xl font-bold text-blue-600 dark:text-blue-400">
                  ${selectedPlan === "monthly" ? "5" : "30"}{" "}
                </span>
                <span className="text-slate-600 dark:text-slate-400 text-sm xs:text-base">
                  /{selectedPlan === "monthly" ? "month" : "year"}
                </span>
              </div>
              {selectedPlan === "yearly" && (
                <div className="text-xs xs:text-sm text-green-600 dark:text-green-400 font-medium mt-1.5 xs:mt-2">
                  Save $30 per year!
                </div>
              )}
            </div>

            <ul className="space-y-3 xs:space-y-4 mb-6 xs:mb-8">
              {[
                "Create unlimited shared groups",
                "Log and track all expenses",
                "Automatic debt calculations",
                "Split costs among group members",
                "View who owes whom",
                "Perfect for roommates & travelers",
                "Secure data storage",
                "Mobile-friendly interface",
              ].map((feature, index) => (
                <li
                  key={index}
                  className="flex items-center text-sm xs:text-base"
                >
                  <CheckCircle className="h-4 w-4 xs:h-5 xs:w-5 text-green-500 dark:text-green-400 mr-2 xs:mr-3 flex-shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <div className="w-full">
              {/* Option 1: Start a free trial without payment */}
              {user &&
                !user.isSubscribed &&
                (!user.isTrialActive ||
                  new Date(user.trialEndsAt || 0) <= new Date()) && (
                  <button
                    onClick={startFreeTrial}
                    disabled={isPageLoading}
                    className="w-full bg-green-600 dark:bg-green-500 text-white
                    py-2.5 xs:py-3 rounded-lg xs:rounded-xl font-semibold
                    hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 mb-3 flex items-center justify-center text-sm xs:text-base
                    transition-all duration-200"
                  >
                    {isPageLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 xs:h-5 xs:w-5 border-b-2 border-white mr-2"></div>
                    ) : (
                      "Start 3-Day Free Trial"
                    )}
                  </button>
                )}

              {/* Show "OR" only if the free trial button is visible */}
              {user &&
                !user.isSubscribed &&
                (!user.isTrialActive ||
                  new Date(user.trialEndsAt || 0) <= new Date()) && (
                  <div className="text-center text-slate-600 dark:text-slate-400 mb-3 text-sm">
                    OR
                  </div>
                )}

              {/* Option 2: Subscribe with PayPal (which may also include a trial from PayPal's side) */}
              <PayPalScriptProvider options={paypalScriptOptions}>
                {selectedPlan === "monthly" && (
                  <PayPalButtons
                    style={{
                      shape: "rect",
                      color: "blue",
                      layout: "vertical",
                      label: "subscribe",
                    }}
                    createSubscription={(data, actions) => {
                      if (
                        !PAYPAL_MONTHLY_PLAN_ID ||
                        PAYPAL_MONTHLY_PLAN_ID.includes("YOUR_")
                      ) {
                        throw new Error(
                          "Monthly PayPal Plan ID is not configured."
                        );
                      }
                      return actions.subscription.create({
                        plan_id: PAYPAL_MONTHLY_PLAN_ID,
                      });
                    }}
                    onApprove={onApprove}
                    onError={onError}
                    disabled={isPageLoading}
                  />
                )}
                {selectedPlan === "yearly" && (
                  <PayPalButtons
                    style={{
                      shape: "rect",
                      color: "blue",
                      layout: "vertical",
                      label: "subscribe",
                    }}
                    createSubscription={(data, actions) => {
                      if (
                        !PAYPAL_YEARLY_PLAN_ID ||
                        PAYPAL_YEARLY_PLAN_ID.includes("YOUR_")
                      ) {
                        throw new Error(
                          "Yearly PayPal Plan ID is not configured."
                        );
                      }
                      return actions.subscription.create({
                        plan_id: PAYPAL_YEARLY_PLAN_ID,
                      });
                    }}
                    onApprove={onApprove}
                    onError={onError}
                    disabled={isPageLoading}
                  />
                )}
              </PayPalScriptProvider>
            </div>

            <p className="text-xs xs:text-sm text-slate-500 dark:text-slate-400 text-center mt-3 xs:mt-4">
              Secure payment via PayPal. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
