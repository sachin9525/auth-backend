const crypto = require("crypto");
const User = require("../models/User");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} = require("../utils/jwt");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} = require("../utils/email");
const { sendSuccess, sendError } = require("../utils/response");

// ─────────────────────────────────────────
// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
// ─────────────────────────────────────────
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1) Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Avoid timing attacks — same message for existing/non-existing
      return sendError(res, 409, "An account with this email already exists.");
    }

    // 2) Create user
    const user = new User({ name, email, password });

    // 3) Generate email verification token
    const verificationToken = user.generateEmailVerificationToken();

    await user.save();

    // 4) Send verification email
    try {
      await sendVerificationEmail(user, verificationToken);
    } catch (emailErr) {
      // Don't fail signup if email fails — log and continue
      console.error("Email send failed:", emailErr.message);
    }

    return sendSuccess(
      res,
      201,
      "Account created! Please check your email to verify your account.",
      {
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
          },
        },
      },
    );
  } catch (error) {
    console.error("Signup error:", error);
    return sendError(res, 500, "Server error during signup.", error.message);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/auth/verify-email/:token
// @desc    Verify email address
// @access  Public
// ─────────────────────────────────────────
exports.verifyEmail = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return sendError(res, 400, "Invalid or expired verification token.");
    }

    if (user.isEmailVerified) {
      return sendError(res, 400, "Email is already verified.");
    }

    // Update user
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // Send welcome email
    try {
      await sendWelcomeEmail(user);
    } catch (err) {
      console.error("Welcome email failed:", err.message);
    }

    return sendSuccess(
      res,
      200,
      "Email verified successfully! You can now log in.",
    );
  } catch (error) {
    return sendError(res, 500, "Email verification failed.", error.message);
  }
};

// ─────────────────────────────────────────
// @route   POST /api/auth/resend-verification
// @desc    Resend email verification
// @access  Public
// ─────────────────────────────────────────
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user || user.isEmailVerified) {
      return sendSuccess(
        res,
        200,
        "If an unverified account with that email exists, a verification link has been sent.",
      );
    }

    const verificationToken = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    await sendVerificationEmail(user, verificationToken);

    return sendSuccess(
      res,
      200,
      "Verification email resent. Please check your inbox.",
    );
  } catch (error) {
    return sendError(
      res,
      500,
      "Could not resend verification email.",
      error.message,
    );
  }
};

// ─────────────────────────────────────────
// @route   POST /api/auth/signin
// @desc    Sign in user
// @access  Public
// ─────────────────────────────────────────
exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Find user with password
    const user = await User.findOne({ email }).select(
      "+password +refreshToken",
    );
    if (!user) {
      return sendError(res, 401, "Invalid email or password.");
    }

    // 2) Check if account is active
    if (!user.isActive) {
      return sendError(
        res,
        403,
        "Your account has been deactivated. Contact support.",
      );
    }

    // 3) Check if account is locked
    if (user.isLocked()) {
      const lockMinutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return sendError(
        res,
        423,
        `Account temporarily locked due to too many failed attempts. Try again in ${lockMinutes} minute(s).`,
      );
    }

    // 4) Verify password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      await user.incLoginAttempts();
      const remaining = 5 - (user.loginAttempts + 1);
      const msg =
        remaining > 0
          ? `Invalid email or password. ${remaining} attempt(s) remaining before lockout.`
          : "Invalid email or password. Account is now locked for 30 minutes.";
      return sendError(res, 401, msg);
    }

    // 5) Check if email is verified
    if (!user.isEmailVerified) {
      return sendError(
        res,
        403,
        "Please verify your email address. Check your inbox or request a new verification email.",
      );
    }

    // 6) Reset login attempts on success
    await user.resetLoginAttempts();

    // 7) Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // 8) Save hashed refresh token in DB
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // 9) Set refresh token in httpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    return sendSuccess(res, 200, "Signed in successfully.", {
      data: {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          lastLogin: user.lastLogin,
        },
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    return sendError(res, 500, "Server error during signin.", error.message);
  }
};

// ─────────────────────────────────────────
// @route   POST /api/auth/refresh-token
// @desc    Get new access token using refresh token
// @access  Public (cookie required)
// ─────────────────────────────────────────
exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return sendError(res, 401, "No refresh token. Please sign in again.");
    }

    // 1) Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      clearRefreshTokenCookie(res);
      return sendError(
        res,
        401,
        "Invalid or expired refresh token. Please sign in again.",
      );
    }

    // 2) Find user and verify stored token matches
    const user = await User.findById(decoded.id).select("+refreshToken");
    if (!user || user.refreshToken !== token) {
      clearRefreshTokenCookie(res);
      return sendError(
        res,
        401,
        "Refresh token reuse detected. Please sign in again.",
      );
    }

    // 3) Rotate tokens (Refresh Token Rotation)
    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    setRefreshTokenCookie(res, newRefreshToken);

    return sendSuccess(res, 200, "Token refreshed.", {
      data: { accessToken: newAccessToken },
    });
  } catch (error) {
    return sendError(res, 500, "Token refresh failed.", error.message);
  }
};

// ─────────────────────────────────────────
// @route   POST /api/auth/signout
// @desc    Sign out user
// @access  Private
// ─────────────────────────────────────────
exports.signout = async (req, res) => {
  try {
    // Invalidate refresh token in DB
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });

    clearRefreshTokenCookie(res);

    return sendSuccess(res, 200, "Signed out successfully.");
  } catch (error) {
    return sendError(res, 500, "Signout failed.", error.message);
  }
};

// ─────────────────────────────────────────
// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
// ─────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      return sendSuccess(
        res,
        200,
        "If an account with that email exists, a password reset link has been sent.",
      );
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetEmail(user, resetToken);
    } catch (emailErr) {
      // Rollback token on email failure
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return sendError(
        res,
        500,
        "Failed to send password reset email. Try again later.",
      );
    }

    return sendSuccess(
      res,
      200,
      "If an account with that email exists, a password reset link has been sent.",
    );
  } catch (error) {
    return sendError(res, 500, "Forgot password failed.", error.message);
  }
};

// ─────────────────────────────────────────
// @route   POST /api/auth/reset-password/:token
// @desc    Reset password using token
// @access  Public
// ─────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return sendError(res, 400, "Invalid or expired password reset token.");
    }

    // Update password
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // Invalidate all refresh tokens (force re-login everywhere)
    user.refreshToken = undefined;

    await user.save();

    clearRefreshTokenCookie(res);

    return sendSuccess(
      res,
      200,
      "Password reset successful. Please sign in with your new password.",
    );
  } catch (error) {
    return sendError(res, 500, "Password reset failed.", error.message);
  }
};

// ─────────────────────────────────────────
// @route   POST /api/auth/change-password
// @desc    Change password (while logged in)
// @access  Private
// ─────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");

    // Verify current password
    const isCorrect = await user.comparePassword(currentPassword);
    if (!isCorrect) {
      return sendError(res, 401, "Current password is incorrect.");
    }

    user.password = newPassword;
    user.refreshToken = undefined; // force re-login on all devices
    await user.save();

    clearRefreshTokenCookie(res);

    return sendSuccess(
      res,
      200,
      "Password changed successfully. Please sign in again.",
    );
  } catch (error) {
    return sendError(res, 500, "Password change failed.", error.message);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
// ─────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return sendSuccess(res, 200, "User profile fetched.", {
      data: { user },
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch profile.", error.message);
  }
};
