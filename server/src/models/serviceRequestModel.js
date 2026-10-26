import mongoose from "mongoose";

export const SERVICE_TYPES = ["room_service", "laundry", "housekeeping", "maintenance", "extra_amenities", "other"];

const serviceRequestSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    type: { type: String, enum: SERVICE_TYPES, required: true },
    description: { type: String, required: [true, "Please describe what you need"], trim: true, maxlength: 300 },
    status: { type: String, enum: ["open", "in_progress", "completed", "cancelled"], default: "open" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    staffNote: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { timestamps: true }
);
serviceRequestSchema.index({ guest: 1, createdAt: -1 });
serviceRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("ServiceRequest", serviceRequestSchema);
