import Room from "../models/roomModel.js";
import Booking from "../models/bookingModel.js";
import { blockingBookingFilter } from "../utils/availability.js";
import { calculateStay } from "../utils/pricing.js";
import { getSeasonsFor } from "../utils/seasons.js";
import { logActivity } from "../utils/audit.js";

const EDITABLE_FIELDS = ["roomNumber", "category", "pricePerNight", "capacity", "floor", "description", "images", "amenities", "status"];
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj[k]]));

// @desc    Get all available rooms based on date range & filters
// @route   GET /api/v1/rooms/available
// @access  Public
export const getAvailableRooms = async (req, res, next) => {
  try {
    const { checkIn, checkOut, category, adults } = req.query;

    if (!checkIn || !checkOut) {
      res.status(400);
      return next(new Error("Please provide both checkIn and checkOut dates"));
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
      res.status(400);
      return next(new Error("Please provide valid dates"));
    }
    if (checkOutDate <= checkInDate) {
      res.status(400);
      return next(new Error("Check-out date must be after check-in date"));
    }

    // 1. Rooms already booked inside this date range
    const bookedRooms = await Booking.aggregate([
      {
        $match: {
          ...blockingBookingFilter(),
          checkInDate: { $lt: checkOutDate },
          checkOutDate: { $gt: checkInDate },
        },
      },
      { $group: { _id: null, roomIds: { $addToSet: "$room" } } },
    ]);
    const unavailableRoomIds = bookedRooms.length > 0 ? bookedRooms[0].roomIds : [];

    // 2. Rooms that are free and not under maintenance
    const filter = { _id: { $nin: unavailableRoomIds }, status: { $ne: "maintenance" } };
    if (category) filter.category = String(category);
    if (adults) filter["capacity.adults"] = { $gte: Number(adults) };

    const [rooms, seasons] = await Promise.all([
      Room.find(filter).sort({ pricePerNight: 1 }).lean(),
      getSeasonsFor(checkInDate, checkOutDate),
    ]);

    // Attach the real price for these dates (seasonal pricing included)
    const data = rooms.map((room) => {
      const quote = calculateStay(room, checkInDate, checkOutDate, seasons);
      return { ...room, avgRate: quote.averageRate, stayTotal: quote.total, stayNights: quote.nights };
    });

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Price quote for a stay (seasonal pricing included)
// @route   GET /api/v1/rooms/:id/quote?checkIn=&checkOut=
// @access  Public
export const getRoomQuote = async (req, res, next) => {
  try {
    const checkIn = new Date(req.query.checkIn);
    const checkOut = new Date(req.query.checkOut);
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      res.status(400);
      return next(new Error("Please provide valid checkIn and checkOut dates"));
    }
    const room = await Room.findById(req.params.id);
    if (!room) {
      res.status(404);
      return next(new Error("Room not found"));
    }
    const seasons = await getSeasonsFor(checkIn, checkOut);
    res.status(200).json({ success: true, data: { ...calculateStay(room, checkIn, checkOut, seasons), pricePerNight: room.pricePerNight } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single room details
// @route   GET /api/v1/rooms/:id
// @access  Public
export const getRoomById = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      res.status(404);
      return next(new Error("Room not found"));
    }
    res.status(200).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new room
// @route   POST /api/v1/rooms
// @access  Private (Admin / Manager)
export const createRoom = async (req, res, next) => {
  try {
    const room = await Room.create(pick(req.body, EDITABLE_FIELDS));
    logActivity({ req, action: "room_created", targetType: "room", targetId: room._id, details: { roomNumber: room.roomNumber } });
    res.status(201).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

// @desc    Update room details or status
// @route   PUT /api/v1/rooms/:id
// @access  Private (Staff: status only / Admin & Manager: everything)
export const updateRoom = async (req, res, next) => {
  try {
    const isManager = ["admin", "manager"].includes(req.user.role);
    const changes = pick(req.body, isManager ? EDITABLE_FIELDS : ["status"]);

    if (Object.keys(changes).length === 0) {
      res.status(400);
      return next(new Error(isManager ? "Nothing to update" : "Staff can only change a room's status"));
    }

    const before = await Room.findById(req.params.id).lean();
    if (!before) {
      res.status(404);
      return next(new Error("Room not found"));
    }

    const room = await Room.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });

    const details = { fields: Object.keys(changes) };
    if (changes.pricePerNight !== undefined && Number(changes.pricePerNight) !== before.pricePerNight) {
      details.price = { from: before.pricePerNight, to: Number(changes.pricePerNight) };
    }
    if (changes.status && changes.status !== before.status) details.status = { from: before.status, to: changes.status };
    logActivity({ req, action: details.price ? "room_price_changed" : "room_updated", targetType: "room", targetId: room._id, details: { roomNumber: room.roomNumber, ...details } });

    res.status(200).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

// @desc    List every room (staff dashboard)
// @route   GET /api/v1/rooms
// @access  Private (Staff / Manager / Admin)
export const getAllRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find().sort({ roomNumber: 1 });
    res.status(200).json({ success: true, count: rooms.length, data: rooms });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a room (blocked if it has upcoming active bookings)
// @route   DELETE /api/v1/rooms/:id
// @access  Private (Admin / Manager)
export const deleteRoom = async (req, res, next) => {
  try {
    const hasBookings = await Booking.exists({
      room: req.params.id,
      status: { $in: ["pending", "confirmed", "checked_in"] },
      checkOutDate: { $gt: new Date() },
    });
    if (hasBookings) {
      res.status(400);
      return next(new Error("Room has active bookings and cannot be deleted"));
    }
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) {
      res.status(404);
      return next(new Error("Room not found"));
    }
    logActivity({ req, action: "room_deleted", targetType: "room", targetId: room._id, details: { roomNumber: room.roomNumber } });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
