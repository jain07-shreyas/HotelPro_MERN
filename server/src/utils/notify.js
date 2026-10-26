import Notification from "../models/notificationModel.js";
import User from "../models/userModel.js";

// In-app notification for one user. Never throws.
export const notify = async (userId, { title, message, type = "system", link = "" }) => {
  try {
    if (!userId) return;
    await Notification.create({ user: userId, title, message, type, link });
  } catch (err) {
    console.error("[Notify]", err.message);
  }
};

// Notify staff / managers / admins (capped, so a huge team can't make one request slow).
export const notifyStaff = async (payload) => {
  try {
    const staff = await User.find({ role: { $in: ["staff", "manager", "admin"] }, isActive: { $ne: false } })
      .select("_id")
      .limit(50);
    await Promise.all(staff.map((u) => notify(u._id, payload)));
  } catch (err) {
    console.error("[Notify]", err.message);
  }
};
