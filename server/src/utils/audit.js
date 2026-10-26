import AdminLog from "../models/adminLogModel.js";

// Records who did what. Never throws and is not awaited by callers, so logging can't break a request.
export const logActivity = async ({ req, actor, action, targetType = "", targetId = "", details = {} }) => {
  try {
    const user = actor ?? req?.user;
    await AdminLog.create({
      actor: user?._id,
      actorName: user?.name,
      actorRole: user?.role,
      action,
      targetType,
      targetId: targetId ? String(targetId) : "",
      details,
      ip: req?.ip,
    });
  } catch (err) {
    console.error("[Audit]", err.message);
  }
};
