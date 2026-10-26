import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderName: String,
    senderRole: String,
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const supportTicketSchema = new mongoose.Schema(
  {
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: [true, "Subject is required"], trim: true, maxlength: 100 },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    messages: [messageSchema],
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
supportTicketSchema.index({ guest: 1, lastMessageAt: -1 });
supportTicketSchema.index({ status: 1, lastMessageAt: -1 });

export default mongoose.model("SupportTicket", supportTicketSchema);
