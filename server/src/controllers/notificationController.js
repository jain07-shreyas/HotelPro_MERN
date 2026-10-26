import Notification from "../models/notificationModel.js";

// @route GET /api/v1/notifications   -> latest 30 + unread count
export const listNotifications = async (req, res, next) => {
  try {
    const [items, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30),
      Notification.countDocuments({ user: req.user._id, isRead: false }),
    ]);
    res.status(200).json({ success: true, unreadCount, data: items });
  } catch (error) {
    next(error);
  }
};

// @route PATCH /api/v1/notifications/read-all
export const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @route PATCH /api/v1/notifications/:id/read
export const markRead = async (req, res, next) => {
  try {
    const item = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isRead: true }, { new: true });
    if (!item) {
      res.status(404);
      return next(new Error("Notification not found"));
    }
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};
