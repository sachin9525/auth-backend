const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { authLimiter, forgotPasswordLimiter } = require("../middleware/rateLimiter");
const {
  validate,
  signupRules,
  signinRules,
  forgotPasswordRules,
  resetPasswordRules,
  changePasswordRules,
} = require("../middleware/validate");

// ─── Public Routes ───────────────────────────────────────

// POST /api/auth/signup
router.post("/signup", signupRules, validate, authController.signup);

// GET /api/auth/verify-email/:token
router.get("/verify-email/:token", authController.verifyEmail);

// POST /api/auth/resend-verification
router.post("/resend-verification", authController.resendVerification);

// POST /api/auth/signin
router.post("/signin", authLimiter, signinRules, validate, authController.signin);

// POST /api/auth/refresh-token
router.post("/refresh-token", authController.refreshToken);

// POST /api/auth/forgot-password
router.post("/forgot-password", forgotPasswordLimiter, forgotPasswordRules, validate, authController.forgotPassword);

// POST /api/auth/reset-password/:token
router.post("/reset-password/:token", resetPasswordRules, validate, authController.resetPassword);

// ─── Protected Routes ────────────────────────────────────

// GET /api/auth/me
router.get("/me", protect, authController.getMe);

// POST /api/auth/signout
router.post("/signout", protect, authController.signout);

// POST /api/auth/change-password
router.post("/change-password", protect, changePasswordRules, validate, authController.changePassword);

module.exports = router;