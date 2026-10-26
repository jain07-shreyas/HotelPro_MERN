import Booking from "../models/bookingModel.js";
import Room from "../models/roomModel.js";
import HousekeepingTask from "../models/housekeepingTaskModel.js";
import { refundBookingPayment } from "./paymentController.js";
import { sendBookingCancellation } from "../utils/sendEmail.js";
import { blockingBookingFilter } from "../utils/availability.js";
import { calculateStay } from "../utils/pricing.js";
import { getSeasonsFor } from "../utils/seasons.js";
import { notify, notifyStaff } from "../utils/notify.js";
import { logActivity } from "../utils/audit.js";
import { getPagination, pageMeta } from "../utils/pagination.js";

const emailCancellation = (booking) =>
  Booking.findById(booking._id)
    .populate("guest", "name email")
    .populate("room", "roomNumber category")
    .then((b) => b && sendBookingCancellation(b));

// Allowed status changes for staff
const TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "cancelled"],
  checked_in: ["checked_out"],
  checked_out: [],
  cancelled: [],
};

// @desc    Create new booking
// @route   POST /api/v1/bookings
// @access  Private
export const createBooking = async (req, res, next) => {
  try {
    const { roomId, checkInDate, checkOutDate, adults = 1, children = 0, specialRequests } = req.body;

    if (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && req.user.role === "guest" && !req.user.isVerified) {
      res.status(403);
      return next(new Error("Please verify your email address before booking. Check your inbox or resend the link from the banner."));
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      res.status(400);
      return next(new Error("Valid check-in and check-out dates are required"));
    }
    if (checkOut <= checkIn) {
      res.status(400);
      return next(new Error("Check-out date must be after check-in date"));
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkIn < today) {
      res.status(400);
      return next(new Error("Check-in date cannot be in the past"));
    }

    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404);
      return next(new Error("Room not found"));
    }
    if (room.status === "maintenance") {
      res.status(400);
      return next(new Error("Room is not available for booking"));
    }
    if (Number(adults) > room.capacity.adults || Number(children) > room.capacity.children) {
      res.status(400);
      return next(new Error("Guest count exceeds room capacity"));
    }

    // Overlap check
    const isBooked = await Booking.findOne({
      room: roomId,
      ...blockingBookingFilter(),
      checkInDate: { $lt: checkOut },
      checkOutDate: { $gt: checkIn },
    });
    if (isBooked) {
      res.status(400);
      return next(new Error("Selected room is not available for these dates"));
    }

    // Price the stay night by night (seasonal pricing included)
    const seasons = await getSeasonsFor(checkIn, checkOut);
    const quote = calculateStay(room, checkIn, checkOut, seasons);
    if (quote.nights < 1) {
      res.status(400);
      return next(new Error("A stay must be at least one night"));
    }

    const booking = await Booking.create({
      guest: req.user._id,
      room: roomId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      nights: quote.nights,
      totalAmount: quote.total,
      specialRequests,
    });

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in user's bookings
// @route   GET /api/v1/bookings/my-bookings
// @access  Private
export const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ guest: req.user._id })
      .populate("room", "roomNumber category pricePerNight images")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    next(error);
  }
};

// @desc    Get one booking (owner or staff)
// @route   GET /api/v1/bookings/:id
// @access  Private
export const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("room");
    const isStaff = ["staff", "manager", "admin"].includes(req.user.role);
    if (!booking || (!isStaff && booking.guest.toString() !== req.user._id.toString())) {
      res.status(404);
      return next(new Error("Booking not found"));
    }
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel own booking (only if not checked in)
// @route   PATCH /api/v1/bookings/:id/cancel
// @access  Private
export const cancelMyBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, guest: req.user._id });
    if (!booking) {
      res.status(404);
      return next(new Error("Booking not found"));
    }
    if (["checked_in", "checked_out", "cancelled"].includes(booking.status)) {
      res.status(400);
      return next(new Error(`Cannot cancel a booking that is ${booking.status}`));
    }
    const wasPaid = booking.paymentStatus === "paid";
    await refundBookingPayment(booking); // full refund if it was paid
    booking.status = "cancelled";
    await booking.save();

    emailCancellation(booking);
    notify(booking.guest, {
      title: "Booking cancelled",
      message: wasPaid ? "Your booking was cancelled and a full refund has been issued." : "Your booking was cancelled.",
      type: "booking",
      link: "/my-bookings",
    });
    logActivity({ req, action: "booking_cancelled", targetType: "booking", targetId: booking._id, details: { refunded: wasPaid, by: "guest" } });

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bookings (Admin/Staff view), newest first, paginated
// @route   GET /api/v1/bookings?page=&limit=&status=
// @access  Private (Staff / Admin)
export const getAllBookings = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 15 });
    const filter = {};
    if (req.query.status && Object.keys(TRANSITIONS).includes(req.query.status)) filter.status = req.query.status;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("guest", "name email phone")
        .populate("room", "roomNumber category")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, count: bookings.length, data: bookings, pagination: pageMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking status (Confirm, Check-in, Check-out, Cancel)
// @route   PATCH /api/v1/bookings/:id/status
// @access  Private (Staff / Admin)
export const updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!Object.keys(TRANSITIONS).includes(status)) {
      res.status(400);
      return next(new Error(`Status must be one of: ${Object.keys(TRANSITIONS).join(", ")}`));
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.status(404);
      return next(new Error("Booking not found"));
    }
    if (!TRANSITIONS[booking.status].includes(status)) {
      res.status(400);
      return next(new Error(`A ${booking.status.replace("_", " ")} booking cannot be changed to ${status.replace("_", " ")}`));
    }

    const from = booking.status;
    const wasPaid = booking.paymentStatus === "paid";
    if (status === "cancelled") await refundBookingPayment(booking);
    booking.status = status;
    if (status === "checked_in") booking.checkedInAt = new Date();
    if (status === "checked_out") booking.checkedOutAt = new Date();
    await booking.save();

    const room = await Room.findById(booking.room);
    const roomLabel = room ? `Room ${room.roomNumber}` : "your room";

    if (status === "cancelled") emailCancellation(booking);

    if (status === "checked_in") {
      await Room.findByIdAndUpdate(booking.room, { status: "occupied" });
    } else if (status === "checked_out") {
      await Room.findByIdAndUpdate(booking.room, { status: "cleaning" });
      // Housekeeping gets a cleaning task automatically
      await HousekeepingTask.create({
        room: booking.room,
        booking: booking._id,
        type: "cleaning",
        priority: "high",
        notes: "Post check-out cleaning",
        createdBy: req.user._id,
      });
      notifyStaff({ title: "Room needs cleaning", message: `${roomLabel} was checked out.`, type: "housekeeping", link: "/admin?tab=housekeeping" });
    }

    const guestMessages = {
      confirmed: ["Booking confirmed", `Your stay in ${roomLabel} is confirmed.`],
      checked_in: ["Welcome!", `You are checked in to ${roomLabel}. Enjoy your stay.`],
      checked_out: ["Thank you for staying", `You are checked out of ${roomLabel}. Tell us how it went by rating your stay.`],
      cancelled: ["Booking cancelled", wasPaid ? "Your booking was cancelled and a full refund has been issued." : "Your booking was cancelled by the hotel."],
    };
    notify(booking.guest, { title: guestMessages[status][0], message: guestMessages[status][1], type: "booking", link: "/my-bookings" });
    logActivity({ req, action: "booking_status_changed", targetType: "booking", targetId: booking._id, details: { from, to: status, refunded: status === "cancelled" && wasPaid } });

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};
