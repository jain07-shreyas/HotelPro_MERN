import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, "Room number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      required: [true, "Room category is required"],
      enum: ["Standard", "Deluxe", "Executive Suite", "Presidential Suite"],
      index: true,
    },
    pricePerNight: {
      type: Number,
      required: [true, "Price per night is required"],
      min: [0, "Price cannot be negative"],
    },
    capacity: {
      adults: {
        type: Number,
        required: true,
        min: 1,
        default: 2,
      },
      children: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    amenities: {
      type: [String],
      default: ["Free Wi-Fi", "Air Conditioning", "En-suite Bathroom"],
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String }, // Cloudinary/S3 image id
      },
    ],
    status: {
      type: String,
      enum: ["available", "occupied", "cleaning", "maintenance"],
      default: "available",
      index: true,
    },
    floor: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
      trim: true,
    },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
  }
);

// Search optimization compound index
roomSchema.index({ category: 1, status: 1, pricePerNight: 1 });

const Room = mongoose.model("Room", roomSchema);
export default Room;