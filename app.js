const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const { apiLimiter } = require("./middleware/rateLimiter");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { sendError } = require("./utils/response");

const app = express();

// ─── Security Headers ───
app.use(helmet());

// ─── CORS ───
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true, // allow cookies
  })
);

// ─── Body Parsing ───
app.use(express.json({ limit: "10kb" }));  // limit payload size
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Logging ───
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─── Global Rate Limiter ───
app.use("/api", apiLimiter);

// ─── Health Check ───
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "Server is running 🚀" });
});

// ─── Routes ───
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// ─── 404 Handler ───
app.use((req, res) => {
  sendError(res, 404, `Route ${req.method} ${req.originalUrl} not found.`);
});

// ─── Global Error Handler ───
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return sendError(res, 409, `An account with this ${field} already exists.`);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return sendError(res, 422, "Validation failed.", errors);
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return sendError(res, 400, `Invalid ${err.path}: ${err.value}`);
  }

  sendError(
    res,
    err.statusCode || 500,
    err.message || "Internal Server Error"
  );
});

module.exports = app;