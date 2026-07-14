const User = require("../models/User");
const { verifyAccessToken } = require("../utils/jwt");
const { sendError } = require("../utils/response");

// ─────────────────────────────────────────
// protect — verify access token
// ─────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;

    // 1) Get token from Authorization header or cookie
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return sendError(res, 401, "Access denied. No token provided.");
    }

    // 2) Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return sendError(res, 401, "Token expired. Please refresh your token.");
      }
      return sendError(res, 401, "Invalid token.");
    }

    // 3) Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return sendError(res, 401, "User no longer exists.");
    }

    // 4) Check if account is active
    if (!user.isActive) {
      return sendError(res, 403, "Your account has been deactivated.");
    }

    // 5) Check if password changed after token was issued
    if (user.passwordChangedAfter(decoded.iat)) {
      return sendError(
        res,
        401,
        "Password was recently changed. Please log in again."
      );
    }

    // 6) Check if email is verified (optional: enforce on protected routes)
    if (!user.isEmailVerified) {
      return sendError(
        res,
        403,
        "Please verify your email address before accessing this resource."
      );
    }

    const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (
      configuredAdminEmail &&
      user.email.toLowerCase() === configuredAdminEmail &&
      user.role !== "admin"
    ) {
      user.role = "admin";
      await user.save({ validateBeforeSave: false });
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 500, "Authentication error.", error.message);
  }
};

// ─────────────────────────────────────────
// restrictTo — role-based authorization
// ─────────────────────────────────────────
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Access denied. Requires one of these roles: ${roles.join(", ")}.`
      );
    }
    next();
  };
};

module.exports = { protect, restrictTo };
