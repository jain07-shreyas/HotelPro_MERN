import mongoose from "mongoose";

const seasonalPriceSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true, maxlength: 60 },
    startDate: { type: Date, required: [true, "Start date is required"] },
    endDate: { type: Date, required: [true, "End date is required"] },
    // 1.25 = +25% (peak season), 0.8 = -20% (off season)
    multiplier: { type: Number, required: [true, "Multiplier is required"], min: [0.1, "Multiplier must be at least 0.1"], max: [5, "Multiplier cannot exceed 5"] },
    // Empty list = applies to every room category
    categories: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);
seasonalPriceSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.model("SeasonalPrice", seasonalPriceSchema);
