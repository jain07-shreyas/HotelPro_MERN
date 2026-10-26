import mongoose from "mongoose";
import Review from "../models/reviewModel.js";
import Booking from "../models/bookingModel.js";
import Room from "../models/roomModel.js";

// A stay can be reviewed once it is finished: checked out, or paid + confirmed with the check-out date passed.
const isReviewable = (booking) =>
  booking.status === "checked_out" ||
  (booking.status === "confirmed" && booking.paymentStatus === "paid" && new Date(booking.checkOutDate) < new Date());

const recalcRoomRating = async (roomId) => {
  const [stats] = await Review.aggregate([
    { $match: { room: new mongoose.Types.ObjectId(roomId) } },
    { $group: { _id: "$room", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await Room.findByIdAndUpdate(roomId, {
    averageRating: stats ? Math.round(stats.avg * 10) / 10 : 0,
    numReviews: stats ? stats.count : 0,
  });
};

// @route GET /api/v1/reviews/room/:roomId   (public)
export const getRoomReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ room: req.params.roomId })
      .populate("guest", "name")
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/v1/reviews/eligible/:roomId   (private)
// Returns the id of a finished, not-yet-reviewed booking of this user for this room (or null).
export const getEligibleBooking = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ guest: req.user._id, room: req.params.roomId }).sort({ checkOutDate: -1 });
    const reviewed = await Review.find({ booking: { $in: bookings.map((b) => b._id) } }).distinct("booking");
    const reviewedIds = new Set(reviewed.map(String));
    const eligible = bookings.find((b) => isReviewable(b) && !reviewedIds.has(b._id.toString()));
    res.status(200).json({ success: true, data: eligible ? { bookingId: eligible._id } : null });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/v1/reviews   (private)
export const createReview = async (req, res, next) => {
  try {
    const { bookingId, rating, comment = "" } = req.body;
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      res.status(400);
      return next(new Error("Rating must be a whole number from 1 to 5"));
    }

    const booking = await Booking.findOne({ _id: bookingId, guest: req.user._id });
    if (!booking) {
      res.status(404);
      return next(new Error("Booking not found"));
    }
    if (!isReviewable(booking)) {
      res.status(400);
      return next(new Error("You can review a room only after your stay is complete"));
    }
    if (await Review.exists({ booking: booking._id })) {
      res.status(400);
      return next(new Error("You have already reviewed this stay"));
    }

    const review = await Review.create({
      room: booking.room,
      guest: req.user._id,
      booking: booking._id,
      rating: numericRating,
      comment: String(comment).slice(0, 500),
    });
    await recalcRoomRating(booking.room);

    await review.populate("guest", "name");
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

// @route DELETE /api/v1/reviews/:id   (owner, or admin/manager)
export const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    const isModerator = ["admin", "manager"].includes(req.user.role);
    if (!review || (!isModerator && review.guest.toString() !== req.user._id.toString())) {
      res.status(404);
      return next(new Error("Review not found"));
    }
    await review.deleteOne();
    await recalcRoomRating(review.room);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
