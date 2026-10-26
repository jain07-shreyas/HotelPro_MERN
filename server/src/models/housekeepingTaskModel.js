import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    type: { type: String, enum: ["cleaning", "maintenance", "inspection"], default: "cleaning" },
    status: { type: String, enum: ["pending", "in_progress", "done"], default: "pending" },
    priority: { type: String, enum: ["low", "normal", "high"], default: "normal" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: { type: String, trim: true, maxlength: 300, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    completedAt: Date,
  },
  { timestamps: true }
);
taskSchema.index({ status: 1, createdAt: -1 });
taskSchema.index({ room: 1 });

export default mongoose.model("HousekeepingTask", taskSchema);
