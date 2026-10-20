const nodemailer = require('nodemailer');

/**
 * Configure Transporter
 * Uses Gmail SMTP if SMTP_HOST, SMTP_USER and SMTP_PASS are configured in .env.
 */
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass && user.trim() && pass.trim()) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465 || process.env.SMTP_SECURE === 'true',
      auth: {
        user: user.trim(),
        pass: pass.trim()
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    return transporter;
  }

  return null;
};

/**
 * Send OTP Verification Email
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.otp - 6-digit (or 4-digit) OTP
 * @param {string} [options.userName] - Recipient name
 * @param {number} [options.validityMinutes] - OTP expiration in minutes (default 5)
 */
const sendOtpEmail = async ({ to, otp, userName = 'User', validityMinutes = 5 }) => {
  const subject = `Your Password Verification Code: ${otp}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 36px 28px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 36px 32px; text-align: center; }
        .greeting { font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
        .instructions { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 24px; }
        .otp-box { background: #f0f9ff; border: 2px dashed #0284c7; border-radius: 16px; padding: 20px 28px; display: inline-block; margin-bottom: 24px; }
        .otp-code { font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #0284c7; margin-left: 12px; font-family: monospace; }
        .expiry { font-size: 13px; font-weight: 600; color: #ef4444; margin: 0; }
        .security-note { font-size: 12px; color: #94a3b8; line-height: 1.5; margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
        .footer { background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>Event Seat Booking</h1>
          <p>Email OTP Verification Service</p>
        </div>
        <div class="content">
          <p class="greeting">Hello, ${userName}!</p>
          <p class="instructions">We received a request to change the password for your account. Please use the verification code below to authorize this change:</p>
          <div class="otp-box">
            <span class="otp-code">${otp}</span>
          </div>
          <p class="expiry">&#9888; This verification code is valid for <strong>${validityMinutes} minutes</strong> only.</p>
          <p class="security-note">Never share this OTP with anyone. If you did not initiate this password change request, please contact support immediately.</p>
        </div>
        <div class="footer">
          <p>&copy; 2026 Event Seat Booking System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `Event Seat Booking - Password Change OTP\n\nHello ${userName},\n\nYour verification code is: ${otp}\n\nThis code is valid for ${validityMinutes} minutes.\nIf you did not request this change, please ignore this email.`;

  console.log('=======================================================');
  console.log(`[EMAIL SERVICE] Sending ${otp.length}-Digit OTP to: ${to}`);
  console.log(`[EMAIL SERVICE] OTP Code: >> ${otp} <<`);
  console.log(`[EMAIL SERVICE] Valid For: ${validityMinutes} minutes`);
  console.log('=======================================================');

  const activeTransporter = getTransporter();

  if (activeTransporter) {
    try {
      const from = process.env.EMAIL_FROM || '"Event Seat Booking" <no-reply@eventseatbooking.com>';
      const info = await activeTransporter.sendMail({
        from,
        to,
        subject,
        text: textContent,
        html: htmlContent
      });
      console.log(`[EMAIL SERVICE] Email dispatched successfully. Message ID: ${info.messageId}`);
      return { success: true, delivered: true, messageId: info.messageId };
    } catch (error) {
      console.error(`[EMAIL SERVICE] SMTP delivery failed: ${error.message}`);
      // If real SMTP was configured but failed, return failure so controller can handle
      return {
        success: false,
        delivered: false,
        error: error.message,
        isSmtpConfigured: true
      };
    }
  }

  // If SMTP is not yet configured (e.g. initial setup before adding Gmail App Password)
  console.log('[EMAIL SERVICE] SMTP credentials not provided. OTP logged in server terminal for local development.');
  return {
    success: true,
    delivered: false,
    isSmtpConfigured: false,
    note: 'Logged in server console'
  };
};

module.exports = {
  sendOtpEmail
};
