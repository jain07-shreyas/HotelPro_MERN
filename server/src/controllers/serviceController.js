import ServiceRequest, { SERVICE_TYPES } from "../models/serviceRequestModel.js";
import Booking from "../models/bookingModel.js";
import User from "../models/userModel.js";
import { notify, notifyStaff } from "../utils/notify.js";
import { getPagination, pageMeta } from "../utils/pagination.js";

const STATUSES = ["open", "in_progress", "completed", "cancelled"];
const LABEL = {
  room_service: "Room service",
  laundry: "Laundry",
  housekeeping: "Housekeeping",
  maintenance: "Maintenance",
  extra_amenities: "Extra amenities",
  other: "Other",
};

// @route POST /api/v1/services   body: { bookingId, type, description }   (guest)
export const createRequest = async (req, res, next) => {
  try {
    const { bookingId, type, description } = req.body;
    if (!SERVICE_TYPES.includes(type)) {
      res.status(400);
      return next(new Error(`Type must be one of: ${SERVICE_TYPES.join(", ")}`));
    }
    const booking = await Booking.findOne({ _id: bookingId, guest: req.user._id }).populate("room", "roomNumber");
    if (!booking) {
      res.status(404);
      return next(new Error("Booking not found"));
    }
    if (!["confirmed", "checked_in"].includes(booking.status)) {
      res.status(400);
      return next(new Error("Service requests are available for confirmed or in-house stays"));
    }
    const request = await ServiceRequest.create({
      booking: booking._id,
      guest: req.user._id,
      room: booking.room._id,
      type,
      description: String(description ?? "").trim(),
    });
    notifyStaff({ title: "New service request", message: `Room ${booking.room.roomNumber}: ${LABEL[type]}`, type: "service", link: "/admin?tab=services" });
    res.status(201).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/v1/services/mine   (guest)
export const listMine = async (req, res, next) => {
  try {
    const requests = await ServiceRequest.find({ guest: req.user._id }).populate("room", "roomNumber").sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/v1/services?status=&page=   (staff)
export const listAll = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20 });
    const filter = {};
    if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
    const [requests, total] = await Promise.all([
      ServiceRequest.find(filter)
        .populate("guest", "name")
        .populate("room", "roomNumber")
        .populate("assignedTo", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ServiceRequest.countDocuments(filter),
    ]);
    res.status(200).json({ success: true, data: requests, pagination: pageMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

// @route PATCH /api/v1/services/:id   body: { status?, staffNote?, claim?, assignedTo? }   (staff)
export const updateRequest = async (req, res, next) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      res.status(404);
      return next(new Error("Request not found"));
    }
    const { status, staffNote, claim, assignedTo } = req.body;
    const before = request.status;

    if (status !== undefined) {
      if (!STATUSES.includes(status)) {
        res.status(400);
        return next(new Error(`Status must be one of: ${STATUSES.join(", ")}`));
      }
      request.status = status;
      if (status === "in_progress" && !request.assignedTo) request.assignedTo = req.user._id;
    }
    if (claim) request.assignedTo = req.user._id;
    if (assignedTo !== undefined) {
      if (!["admin", "manager"].includes(req.user.role)) {
        res.status(403);
        return next(new Error("Only a manager or admin can assign requests to others"));
      }
      if (assignedTo && !(await User.exists({ _id: assignedTo, role: { $in: ["staff", "manager", "admin"] } }))) {
        res.status(400);
        return next(new Error("Assignee must be a staff member"));
      }
      request.assignedTo = assignedTo || undefined;
    }
    if (staffNote !== undefined) request.staffNote = String(staffNote).slice(0, 300);
    await request.save();

    if (request.status !== before) {
      notify(request.guest, {
        title: "Service request update",
        message: `Your ${LABEL[request.type].toLowerCase()} request is now ${request.status.replace("_", " ")}.`,
        type: "service",
        link: "/services",
      });
    }
    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

// @route PATCH /api/v1/services/:id/cancel   (the guest who made it, while still open)
export const cancelRequest = async (req, res, next) => {
  try {
    const request = await ServiceRequest.findOne({ _id: req.params.id, guest: req.user._id });
    if (!request) {
      res.status(404);
      return next(new Error("Request not found"));
    }
    if (request.status !== "open") {
      res.status(400);
      return next(new Error("Only open requests can be cancelled"));
    }
    request.status = "cancelled";
    await request.save();
    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};
