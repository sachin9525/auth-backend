const nodemailer = require("nodemailer");

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// ─── Send Email Verification ───
const sendVerificationEmail = async (user, token) => {
  const verifyURL = `${process.env.CLIENT_URL}/verify-email/${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #4F46E5;">Verify Your Email Address</h2>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
      <a href="${verifyURL}" 
         style="display:inline-block; padding:12px 24px; background:#4F46E5; color:#fff; text-decoration:none; border-radius:6px; margin:16px 0;">
        Verify Email
      </a>
      <p>Or copy this link: <a href="${verifyURL}">${verifyURL}</a></p>
      <p style="color:#888; font-size:13px;">This link expires in <strong>24 hours</strong>. If you didn't create an account, ignore this email.</p>
    </div>
  `;

  await createTransporter().sendMail({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: "Verify Your Email Address",
    html,
  });
};

// ─── Send Password Reset Email ───
const sendPasswordResetEmail = async (user, token) => {
  const resetURL = `${process.env.CLIENT_URL}/reset-password/${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #DC2626;">Reset Your Password</h2>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>You requested a password reset. Click the button below to set a new password:</p>
      <a href="${resetURL}" 
         style="display:inline-block; padding:12px 24px; background:#DC2626; color:#fff; text-decoration:none; border-radius:6px; margin:16px 0;">
        Reset Password
      </a>
      <p>Or copy this link: <a href="${resetURL}">${resetURL}</a></p>
      <p style="color:#888; font-size:13px;">This link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email. Your password will remain unchanged.</p>
    </div>
  `;

  await createTransporter().sendMail({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: "Password Reset Request",
    html,
  });
};

// ─── Send Welcome Email (after verification) ───
const sendWelcomeEmail = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #059669;">Welcome aboard, ${user.name}! 🎉</h2>
      <p>Your email has been successfully verified. Your account is now fully active.</p>
      <p>You can now log in and start using all features.</p>
    </div>
  `;

  await createTransporter().sendMail({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: "Welcome! Email Verified Successfully",
    html,
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};