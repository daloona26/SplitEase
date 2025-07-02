// frontend/src/pages/Pricing.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, api } from "../contexts/AuthContext"; // Import 'api' for authenticated calls
import Navbar from "../components/Navbar";
import { CheckCircle } from "lucide-react";
// PayPalScriptProvider and PayPalButtons for client-side rendering
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export default function Pricing() {
  const { user, refreshUser, loading: authLoading } = useAuth(); // Get user, refreshUser, and authLoading
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false); // Local loading for PayPal actions
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">(
    "monthly"
  );

  // Combine authLoading with local loading for a unified page loading state
  const isPageLoading = authLoading || loading;

  // IMPORTANT: Get PayPal Client ID and Plan IDs from frontend environment variables
  const PAYPAL_CLIENT_ID =
    import.meta.env.VITE_PAYPAL_CLIENT_ID ||
    "YOUR_PAYPAL_CLIENT_ID_FROM_ENV_FALLBACK";
  const PAYPAL_MONTHLY_PLAN_ID =
    import.meta.env.VITE_PAYPAL_MONTHLY_PLAN_ID ||
    "YOUR_MONTHLY_PAYPAL_PLAN_ID_FROM_ENV_FALLBACK";
  const PAYPAL_YEARLY_PLAN_ID =
    import.meta.env.VITE_PAYPAL_YEARLY_PLAN_ID ||
    "YOUR_YEARLY_PAYPAL_PLAN_ID_FROM_ENV_FALLBACK";

  // --- DEBUGGING: Log environment variables to console (keep for development, remove for production build if desired) ---
  useEffect(() => {
    console.log("--- Pricing.tsx Environment Variables Debug ---");
    console.log("VITE_PAYPAL_CLIENT_ID:", PAYPAL_CLIENT_ID);
    console.log("VITE_PAYPAL_MONTHLY_PLAN_ID:", PAYPAL_MONTHLY_PLAN_ID);
    console.log("VITE_PAYPAL_YEARLY_PLAN_ID:", PAYPAL_YEARLY_PLAN_ID);
    console.log("---------------------------------------------");
  }, []); // Run once on component mount
  // --- END DEBUGGING ---

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
    // environment: "sandbox", // <-- THIS LINE IS REMOVED FOR LIVE DEPLOYMENT
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
      console.log("PayPal subscription approved:", data.subscriptionID);

      // IMPORTANT: Do NOT update user.isSubscribed here directly.
      // Rely on the backend webhook to update the database for subscription status.
      // After PayPal redirects back, your dashboard can then refresh user status.
      // The backend webhook for BILLING.SUBSCRIPTION.ACTIVATED will handle setting is_trial_active.
      // The backend webhook for BILLING.SUBSCRIPTION.PAYMENT.COMPLETED will handle setting is_subscribed.
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
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-700 text-lg">Loading pricing info...</p>
        </div>
      </div>
    );
  }

  // If user is already subscribed (after loading is done), show nothing (redirect handled by useEffect)
  // If user is on an active trial, they are allowed to see this page, so we don't return null here.
  if (user?.isSubscribed) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600">
            Perfect for roommates, couples, and travelers splitting costs
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 p-1 rounded-lg flex">
            <button
              onClick={() => setSelectedPlan("monthly")}
              className={`px-6 py-2 rounded-md font-medium ${
                selectedPlan === "monthly"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600"
              }`}
              disabled={isPageLoading} // Disable if any loading is happening
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedPlan("yearly")}
              className={`px-6 py-2 rounded-md font-medium ${
                selectedPlan === "yearly"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600"
              }`}
              disabled={isPageLoading} // Disable if any loading is happening
            >
              Yearly
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 max-w-md mx-auto">
            {error}
          </div>
        )}

        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-blue-200">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900">
                SplitEase Pro
              </h3>
              <div className="mt-4">
                <span className="text-5xl font-bold text-blue-600">
                  ${selectedPlan === "monthly" ? "5" : "30"}{" "}
                  {/* Changed from "50" to "30" */}
                </span>
                <span className="text-gray-600">
                  /{selectedPlan === "monthly" ? "month" : "year"}
                </span>
              </div>
              {selectedPlan === "yearly" && (
                <div className="text-sm text-green-600 font-medium mt-2">
                  Save $30 per year! {/* Updated save message */}
                </div>
              )}
            </div>

            <ul className="space-y-4 mb-8">
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
                <li key={index} className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="w-full">
              {/* Option 1: Start a free trial without payment */}
              {/* Only show this button if the user is not already on an active trial */}
              {user &&
                !user.isSubscribed &&
                (!user.isTrialActive ||
                  new Date(user.trialEndsAt || 0) <= new Date()) && (
                  <button
                    onClick={startFreeTrial}
                    disabled={isPageLoading}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 mb-4 flex items-center justify-center"
                  >
                    {isPageLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
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
                  <div className="text-center text-gray-600 mb-4">OR</div>
                )}

              {/* Option 2: Subscribe with PayPal (which may also include a trial from PayPal's side) */}
              <PayPalScriptProvider options={paypalScriptOptions}>
                {/* Conditionally render the PayPal button based on selectedPlan */}
                {selectedPlan === "monthly" && (
                  <PayPalButtons
                    style={{
                      shape: "rect",
                      color: "blue", // Using 'blue' for better integration with your app's theme
                      layout: "vertical",
                      label: "subscribe",
                    }}
                    createSubscription={(data, actions) => {
                      // This function is called to create the subscription on PayPal's side
                      // It uses the plan_id from your environment variables
                      if (
                        !PAYPAL_MONTHLY_PLAN_ID ||
                        PAYPAL_MONTHLY_PLAN_ID.includes("YOUR_")
                      ) {
                        // This error is caught by the onError handler below
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
                      color: "blue", // Using 'blue' for better integration with your app's theme
                      layout: "vertical",
                      label: "subscribe",
                    }}
                    createSubscription={(data, actions) => {
                      // This function is called to create the subscription on PayPal's side
                      // It uses the plan_id from your environment variables
                      if (
                        !PAYPAL_YEARLY_PLAN_ID ||
                        PAYPAL_YEARLY_PLAN_ID.includes("YOUR_")
                      ) {
                        // This error is caught by the onError handler below
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

            <p className="text-sm text-gray-500 text-center mt-4">
              Secure payment via PayPal. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
