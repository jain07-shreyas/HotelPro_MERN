import mongoose from "mongoose";

const adminLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorName: String,
    actorRole: String,
    action: { type: String, required: true, index: true },
    targetType: { type: String, default: "" },
    targetId: { type: String, default: "" },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: String,
  },
  { timestamps: true }
);
adminLogSchema.index({ createdAt: -1 });

export default mongoose.model("AdminLog", adminLogSchema);
