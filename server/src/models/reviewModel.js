import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // One review per booking
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    rating: { type: Number, required: [true, "Rating is required"], min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: [500, "Comment cannot exceed 500 characters"], default: "" },
  },
  { timestamps: true }
);

const Review = mongoose.model("Review", reviewSchema);
export default Review;
