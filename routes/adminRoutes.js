const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const { protect, restrictTo } = require("../middleware/auth");

// All admin routes require auth + admin role
router.use(protect, restrictTo("admin"));

// GET /api/admin/users
router.get("/users", adminController.getAllUsers);

// PATCH /api/admin/users/:id/role
router.patch("/users/:id/role", adminController.updateUserRole);

// PATCH /api/admin/users/:id/status
router.patch("/users/:id/status", adminController.toggleUserStatus);

// DELETE /api/admin/users/:id
router.delete("/users/:id", adminController.deleteUser);

module.exports = router;