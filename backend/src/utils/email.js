// backend/src/utils/email.js

const nodemailer = require("nodemailer");

// Create a transporter object using the default SMTP transport
// You'll need to configure this with your email service provider's details.
// For example, if using Gmail, you'd enable "Less secure app access" or use App Passwords.
// For production, consider services like SendGrid, Mailgun, AWS SES, etc.
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // e.g., 'smtp.gmail.com' or your SMTP server
  port: process.env.EMAIL_PORT, // e.g., 587 for TLS, 465 for SSL
  secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports like 587
  auth: {
    user: process.env.EMAIL_USER, // Your email address (e.g., your_email@gmail.com)
    pass: process.env.EMAIL_PASS, // Your email password or app-specific password
  },
  // Optional: Disable TLS/SSL verification for local development with self-signed certs (NOT for production)
  tls: {
    rejectUnauthorized: false,
  },
});

/**
 * Sends an email using the configured Nodemailer transporter.
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject line of the email.
 * @param {string} text - The plain text body of the email.
 * @param {string} html - The HTML body of the email.
 */
const sendEmail = async (to, subject, text, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || "SplitEase <noreply@splitease.com>", // Sender address
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    // In production, you might want to log this error to a monitoring service
    return false;
  }
};

module.exports = { sendEmail };
