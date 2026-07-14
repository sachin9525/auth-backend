require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const User = require("./models/User");

const PORT = process.env.PORT || 5000;

const ensureConfiguredAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) return;

  const admin = await User.findOneAndUpdate(
    { email: adminEmail },
    { $set: { role: "admin" } },
    { new: true }
  );

  if (!admin) {
    console.warn("ADMIN_EMAIL does not match a user.");
    return;
  }

  console.log("Configured admin role is ready.");
};

const startServer = async () => {
  await connectDB();
  await ensureConfiguredAdmin();

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`📍 Health: http://localhost:${PORT}/health`);
    console.log(`🔐 Auth:   http://localhost:${PORT}/api/auth`);
    console.log(`👑 Admin:  http://localhost:${PORT}/api/admin`);
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION:", err.message);
    server.close(() => process.exit(1));
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM received. Shutting down gracefully...");
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  });
};

startServer();
