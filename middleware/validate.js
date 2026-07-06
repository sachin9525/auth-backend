const { body, validationResult } = require("express-validator");
const { sendError } = require("../utils/response");

// ─── Run Validation Result ───
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 422, "Validation failed.", errors.array());
  }
  next();
};

// ─── Signup Rules ───
const signupRules = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required.")
    .isLength({ min: 2, max: 50 }).withMessage("Name must be 2–50 characters."),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Please provide a valid email.")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required.")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter.")
    .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter.")
    .matches(/[0-9]/).withMessage("Password must contain at least one number.")
    .matches(/[@$!%*?&#^]/).withMessage("Password must contain at least one special character (@$!%*?&#^)."),

  body("confirmPassword")
    .notEmpty().withMessage("Please confirm your password.")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match.");
      }
      return true;
    }),
];

// ─── Signin Rules ───
const signinRules = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Please provide a valid email.")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required."),
];

// ─── Forgot Password Rules ───
const forgotPasswordRules = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Please provide a valid email.")
    .normalizeEmail(),
];

// ─── Reset Password Rules ───
const resetPasswordRules = [
  body("password")
    .notEmpty().withMessage("Password is required.")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter.")
    .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter.")
    .matches(/[0-9]/).withMessage("Password must contain at least one number.")
    .matches(/[@$!%*?&#^]/).withMessage("Password must contain at least one special character."),

  body("confirmPassword")
    .notEmpty().withMessage("Please confirm your password.")
    .custom((value, { req }) => {
      if (value !== req.body.password) throw new Error("Passwords do not match.");
      return true;
    }),
];

// ─── Change Password Rules ───
const changePasswordRules = [
  body("currentPassword")
    .notEmpty().withMessage("Current password is required."),

  body("newPassword")
    .notEmpty().withMessage("New password is required.")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
    .matches(/[A-Z]/).withMessage("Must contain at least one uppercase letter.")
    .matches(/[a-z]/).withMessage("Must contain at least one lowercase letter.")
    .matches(/[0-9]/).withMessage("Must contain at least one number.")
    .matches(/[@$!%*?&#^]/).withMessage("Must contain at least one special character.")
    .custom((value, { req }) => {
      if (value === req.body.currentPassword)
        throw new Error("New password must be different from the current password.");
      return true;
    }),

  body("confirmPassword")
    .notEmpty().withMessage("Please confirm your new password.")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) throw new Error("Passwords do not match.");
      return true;
    }),
];

module.exports = {
  validate,
  signupRules,
  signinRules,
  forgotPasswordRules,
  resetPasswordRules,
  changePasswordRules,
};