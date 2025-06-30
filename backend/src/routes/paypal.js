// backend/src/routes/paypal.js

const express = require("express");
const paypal = require("paypal-rest-sdk");
const { query } = require("../db");
const authenticateToken = require("../middleware/auth");
const bodyParser = require("body-parser");

const router = express.Router();

paypal.configure({
  mode: process.env.NODE_ENV === "production" ? "live" : "sandbox", // This line handles live/sandbox switching
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

// --- Create PayPal Subscription Route ---
router.post("/create-subscription", authenticateToken, async (req, res) => {
  const { planId } = req.body;
  const userId = req.user.id;
  const userEmail = req.user.email;
  const userName = req.user.name;

  if (!planId) {
    return res.status(400).json({ message: "PayPal plan ID is required." });
  }

  try {
    const create_subscription_json = {
      plan_id: planId,
      subscriber: {
        payment_source: {
          paypal: {},
        },
        name: {
          given_name: userName.split(" ")[0] || "User",
          surname: userName.split(" ").slice(1).join(" ") || "Name",
        },
        email_address: userEmail,
        custom_id: userId, // Pass your internal user ID to PayPal.
      },
      application_context: {
        return_url: `${process.env.FRONTEND_URL}/dashboard?payment_status=success`,
        cancel_url: `${process.env.FRONTEND_URL}/pricing?payment_status=cancelled`,
        shipping_preference: "NO_SHIPPING",
      },
    };

    // Using a Promise wrapper around paypal.subscription.create for better async/await handling
    await new Promise((resolve, reject) => {
      paypal.subscription.create(
        create_subscription_json,
        async (error, subscription) => {
          if (error) {
            console.error(
              "PayPal create subscription error details:",
              error.response ? JSON.stringify(error.response, null, 2) : error
            );
            return reject(
              new Error("PayPal API error during subscription creation.")
            );
          } else {
            const approveLink = subscription.links.find(
              (link) => link.rel === "approve"
            );
            if (approveLink) {
              // Calculate trial end date (current time + 3 days)
              const trialEndsAt = new Date();
              trialEndsAt.setDate(trialEndsAt.getDate() + 3);

              // Update user's PayPal Subscription ID and trial status in your database BEFORE redirecting
              // is_subscribed remains FALSE here because the user is only on trial.
              try {
                await query(
                  "UPDATE users SET paypal_subscription_id = $1, is_trial_active = TRUE, trial_ends_at = $2 WHERE id = $3",
                  [subscription.id, trialEndsAt.toISOString(), userId]
                );
                console.log(
                  `User ${userId} linked to PayPal Subscription ID: ${subscription.id} and started 3-day trial.`
                );
              } catch (dbUpdateError) {
                console.error(
                  "Database update error after PayPal subscription creation (trial start):",
                  dbUpdateError
                );
                // Still attempt to return approval URL even if DB update fails, user can try again or manual fix
                return res.status(500).json({
                  message:
                    "Subscription created on PayPal, but failed to link trial status in DB. Please contact support.",
                  approve_url: approveLink.href,
                  paypalSubscriptionId: subscription.id,
                });
              }

              res.status(200).json({
                approve_url: approveLink.href,
                paypalSubscriptionId: subscription.id,
              });
              resolve(true); // Resolve the promise
            } else {
              console.error("No approval URL found from PayPal response.");
              reject(new Error("No approval URL found from PayPal."));
            }
          }
        }
      );
    });
  } catch (error) {
    console.error("Create subscription route outer error:", error);
    res.status(500).json({
      message:
        error.message || "Server error during PayPal subscription creation.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// --- PayPal Webhook Listener ---
router.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    const transmissionId = req.headers["paypal-transmission-id"];
    const transmissionTime = req.headers["paypal-transmission-time"];
    const certUrl = req.headers["paypal-cert-url"];
    const authAlgo = req.headers["paypal-auth-algo"];
    const transmissionSig = req.headers["paypal-transmission-sig"];
    const webhookEvent = JSON.parse(req.body.toString());

    console.log("Received PayPal webhook event:", webhookEvent.event_type);

    try {
      const isValid = await new Promise((resolve, reject) => {
        paypal.notification.webhook.verify(
          transmissionId,
          transmissionTime,
          certUrl,
          authAlgo,
          transmissionSig,
          req.body.toString(),
          webhookId,
          (error, response) => {
            if (error) {
              reject(error);
            } else {
              resolve(response);
            }
          }
        );
      });

      if (!isValid) {
        console.warn(
          "Webhook signature verification failed for event:",
          webhookEvent.event_type
        );
        return res.status(403).json({ message: "Invalid webhook signature." });
      }
      console.log("Webhook signature verified successfully.");

      switch (webhookEvent.event_type) {
        case "BILLING.SUBSCRIPTION.ACTIVATED":
          // This event fires when the subscription (including trial) is activated.
          // The user is now officially on their trial period.
          const activatedSubscription = webhookEvent.resource;
          const userIdFromPayPalActivated =
            activatedSubscription.subscriber.custom_id;
          const paypalSubscriptionIdActivated = activatedSubscription.id;

          console.log(
            `WEBHOOK DEBUG: Subscription ACTIVATED (trial started) for user ID ${userIdFromPayPalActivated} (PayPal Sub ID: ${paypalSubscriptionIdActivated})`
          );

          // Ensure the user's trial status is correctly set.
          // is_subscribed remains FALSE at this point, as they are only in trial.
          const trialUpdateResult = await query(
            "UPDATE users SET paypal_subscription_id = $1, is_trial_active = TRUE, trial_ends_at = NOW() + INTERVAL '3 days' WHERE id = $2",
            [paypalSubscriptionIdActivated, userIdFromPayPalActivated]
          );

          console.log(
            `WEBHOOK DEBUG: DB Update Result (rows affected for trial activation):`,
            trialUpdateResult.rowCount
          );
          console.log(
            `WEBHOOK DEBUG: User ${userIdFromPayPalActivated} updated to trial active.`
          );
          break;

        case "BILLING.SUBSCRIPTION.PAYMENT.COMPLETED":
          // This webhook fires when a payment is successfully completed.
          // This is the ideal point to mark the user as fully subscribed and end the trial.
          const completedPayment = webhookEvent.resource;
          const userIdFromPayPalPayment = completedPayment.subscriber.custom_id;
          const paypalSubscriptionIdPayment =
            completedPayment.billing_agreement_id || completedPayment.id; // Use billing_agreement_id for subscription payments

          console.log(
            `WEBHOOK DEBUG: Subscription PAYMENT COMPLETED for user ID ${userIdFromPayPalPayment} (PayPal Sub ID: ${paypalSubscriptionIdPayment})`
          );

          const paymentUpdateResult = await query(
            "UPDATE users SET is_subscribed = TRUE, is_trial_active = FALSE, trial_ends_at = NULL WHERE id = $1 AND paypal_subscription_id = $2",
            [userIdFromPayPalPayment, paypalSubscriptionIdPayment]
          );

          console.log(
            `WEBHOOK DEBUG: DB Update Result (rows affected for payment completion):`,
            paymentUpdateResult.rowCount
          );
          console.log(
            `WEBHOOK DEBUG: User ${userIdFromPayPalPayment} updated to fully subscribed (trial ended).`
          );
          break;

        case "BILLING.SUBSCRIPTION.CANCELLED":
        case "BILLING.SUBSCRIPTION.EXPIRED":
          const cancelledSubscription = webhookEvent.resource;
          const cancelledPaypalSubscriptionId = cancelledSubscription.id;

          console.log(
            `Subscription CANCELLED/EXPIRED for PayPal Sub ID: ${cancelledPaypalSubscriptionId}`
          );

          await query(
            "UPDATE users SET is_subscribed = FALSE, paypal_subscription_id = NULL, is_trial_active = FALSE, trial_ends_at = NULL WHERE paypal_subscription_id = $1",
            [cancelledPaypalSubscriptionId]
          );
          console.log(
            `User with PayPal Sub ID ${cancelledPaypalSubscriptionId} in DB marked as unsubscribed.`
          );
          break;

        default:
          console.log(
            `Unhandled PayPal webhook event type: ${webhookEvent.event_type}`
          );
      }

      res.status(200).send("Webhook received and processed");
    } catch (error) {
      console.error("Error processing PayPal webhook:", error);
      res.status(200).send("Error processing webhook (logged)");
    }
  }
);

module.exports = router;
