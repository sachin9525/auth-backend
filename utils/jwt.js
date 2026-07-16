const jwt = require("jsonwebtoken");

// ─── Generate Access Token (short-lived) ───
const generateAccessToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
  });
};

// ─── Generate Refresh Token (long-lived) ───
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
  });
};

// ─── Verify Access Token ───
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

// ─── Verify Refresh Token ───
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

// ─── Set Refresh Token as httpOnly Cookie ───
const getRefreshTokenCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    // The production frontend (Vercel) and API (Render) are cross-site.
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
};

const setRefreshTokenCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    ...getRefreshTokenCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// ─── Clear Refresh Token Cookie ───
const clearRefreshTokenCookie = (res) => {
  res.clearCookie("refreshToken", getRefreshTokenCookieOptions());
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
};
