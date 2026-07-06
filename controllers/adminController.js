const User = require("../models/User");
const { sendSuccess, sendError } = require("../utils/response");

// ─── GET /api/admin/users ───
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.verified !== undefined)
      filter.isEmailVerified = req.query.verified === "true";

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, "Users fetched.", {
      data: {
        users,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      },
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch users.", error.message);
  }
};

// ─── PATCH /api/admin/users/:id/role ───
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return sendError(res, 400, "Invalid role. Must be 'user' or 'admin'.");
    }

    if (req.params.id === req.user._id.toString()) {
      return sendError(res, 400, "You cannot change your own role.");
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) return sendError(res, 404, "User not found.");

    return sendSuccess(res, 200, `User role updated to '${role}'.`, {
      data: { user },
    });
  } catch (error) {
    return sendError(res, 500, "Failed to update role.", error.message);
  }
};

// ─── PATCH /api/admin/users/:id/status ───
exports.toggleUserStatus = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return sendError(res, 400, "You cannot deactivate your own account.");
    }

    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 404, "User not found.");

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    return sendSuccess(
      res,
      200,
      `User account ${user.isActive ? "activated" : "deactivated"} successfully.`,
      { data: { user } }
    );
  } catch (error) {
    return sendError(res, 500, "Failed to toggle user status.", error.message);
  }
};

// ─── DELETE /api/admin/users/:id ───
exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return sendError(res, 400, "You cannot delete your own account.");
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return sendError(res, 404, "User not found.");

    return sendSuccess(res, 200, "User deleted successfully.");
  } catch (error) {
    return sendError(res, 500, "Failed to delete user.", error.message);
  }
};