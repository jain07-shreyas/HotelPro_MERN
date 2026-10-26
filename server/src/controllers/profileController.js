import User from "../models/userModel.js";

// @route PUT /api/v1/profile   (private)
export const updateProfile = async (req, res, next) => {
  try {
    const name = String(req.body.name ?? "").trim();
    const phone = String(req.body.phone ?? "").trim();

    if (!name || name.length > 50) {
      res.status(400);
      return next(new Error("Name is required and must be at most 50 characters"));
    }
    if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) {
      res.status(400);
      return next(new Error("Please enter a valid phone number"));
    }

    const user = await User.findByIdAndUpdate(req.user._id, { name, phone }, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @route PUT /api/v1/profile/password   (private)
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || String(newPassword).length < 8) {
      res.status(400);
      return next(new Error("Current password and a new password of at least 8 characters are required"));
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.matchPassword(currentPassword))) {
      res.status(401);
      return next(new Error("Current password is incorrect"));
    }

    user.password = newPassword; // hashed by the pre-save hook
    await user.save();
    res.status(200).json({ success: true, message: "Password updated" });
  } catch (error) {
    next(error);
  }
};
